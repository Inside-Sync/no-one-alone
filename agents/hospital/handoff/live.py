"""Cloud Healthcare API FHIR R4 reader (FHIR_SOURCE=live): read-only, patient-scoped, all or nothing.

Reads Patient/{id} plus one search per resource type the packet uses, Consent included. It does not use
Patient/$everything, which roles/healthcare.fhirResourceReader does not grant. Any failure raises
RecordUnavailable; this reader never falls back to the bundled fixtures.
"""
import asyncio
import json
import logging
import re
import threading
from typing import Callable
from urllib.parse import urlsplit

import httpx

from .fhir import PERSON_ID, RecordUnavailable

API_BASE = "https://healthcare.googleapis.com/v1"
STORE = re.compile(r"projects/[a-z][a-z0-9-]*/locations/[a-z0-9-]+/datasets/[A-Za-z0-9_.-]+/fhirStores/[A-Za-z0-9_.-]+")
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
# (resource type, search parameter); together with the Patient this is what record.normalize uses.
SEARCHES = (("Condition", "patient"), ("MedicationStatement", "patient"), ("AllergyIntolerance", "patient"),
            ("FamilyMemberHistory", "patient"), ("Consent", "patient"))
PAGE_SIZE = 100
MAX_PAGES = 10
DEADLINE = 6.0  # seconds for the whole read; respond-agent gives A2A 12 s of its 20 s budget

log = logging.getLogger("hospital_agent")


def store_name(value: str | None) -> str:
    if not STORE.fullmatch(value or ""):
        raise RuntimeError("FHIR_STORE must be projects/{p}/locations/{l}/datasets/{d}/fhirStores/{s}")
    return value


def api_base(value: str | None) -> str:
    """https only, except plain http to a local emulator. The access token is sent to this host."""
    value = (value or API_BASE).rstrip("/")
    u = urlsplit(value)
    if not (u.scheme == "https" or (u.scheme == "http" and u.hostname in ("localhost", "127.0.0.1"))) or not u.hostname:
        raise RuntimeError("FHIR_API_BASE must be an https URL")
    return value


class AdcTokens:
    """Application Default Credentials: the Cloud Run service account in the cloud, gcloud ADC locally."""

    def __init__(self):
        self._creds = None
        self._lock = threading.Lock()

    def __call__(self) -> str:
        import google.auth
        import google.auth.transport.requests
        with self._lock:
            if self._creds is None:
                self._creds, _ = google.auth.default(scopes=SCOPES)
            if not self._creds.valid:
                self._creds.refresh(google.auth.transport.requests.Request())
            return self._creds.token


class HealthcareReader:
    def __init__(self, store: str, *, base: str | None = None, token_provider: Callable[[], str] | None = None,
                 transport: httpx.AsyncBaseTransport | None = None, deadline: float = DEADLINE):
        self.store = store_name(store)
        self.base = f"{api_base(base)}/{self.store}/fhir"
        self.token_provider = token_provider or AdcTokens()
        self.transport = transport
        self.deadline = deadline

    async def read(self, person_id: str) -> list[dict]:
        if not PERSON_ID.fullmatch(person_id or ""):
            return []
        try:
            return await asyncio.wait_for(self._read(person_id), self.deadline)
        except RecordUnavailable as e:
            reason = str(e)
        except TimeoutError:
            reason = "live: timeout"
        except Exception as e:  # noqa: BLE001 - a malformed store reply must still give PARTIAL, not 502
            reason = f"live: {type(e).__name__}"
        # status or exception type only, never record content or the token
        log.warning(json.dumps({"stage": "fhir", "source": "live", "error": reason}))
        raise RecordUnavailable(reason) from None

    async def _read(self, person_id: str) -> list[dict]:
        try:
            token = await asyncio.to_thread(self.token_provider)
        except Exception as e:  # noqa: BLE001 - google.auth raises several types; keep the name only
            raise RecordUnavailable(f"live: credentials {type(e).__name__}") from None
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/fhir+json"}
        async with httpx.AsyncClient(transport=self.transport, headers=headers, timeout=self.deadline,
                                     follow_redirects=False) as http:
            patient = await self._get(http, f"{self.base}/Patient/{person_id}", missing_ok=True)
            if patient is None:
                return []
            if patient.get("resourceType") != "Patient" or patient.get("id") != person_id:
                raise RecordUnavailable("live: unexpected Patient reply")
            patient_ref = f"Patient/{person_id}"
            # All searches must succeed: a record without its Consent search is never passed on.
            groups = await asyncio.gather(*(self._search(http, kind, param, patient_ref) for kind, param in SEARCHES))
        # Same compartment rule as FixtureReader: only resources that point at this patient.
        return [patient] + [r for g in groups for r in g
                            if any((r.get(k) or {}).get("reference") == patient_ref for k in ("subject", "patient"))]

    async def _get(self, http: httpx.AsyncClient, url: str, params: dict | None = None, *,
                   missing_ok: bool = False) -> dict | None:
        r = await http.get(url, params=params)
        if missing_ok and r.status_code in (404, 410):
            return None
        if r.status_code != 200:
            raise RecordUnavailable(f"live: HTTP {r.status_code}")
        try:
            body = r.json()
        except ValueError:
            raise RecordUnavailable("live: unreadable reply") from None
        if not isinstance(body, dict):
            raise RecordUnavailable("live: unreadable reply")
        return body

    async def _search(self, http: httpx.AsyncClient, kind: str, param: str, patient_ref: str) -> list[dict]:
        url, params = f"{self.base}/{kind}", {param: patient_ref, "_count": str(PAGE_SIZE)}
        found: list[dict] = []
        for _ in range(MAX_PAGES):
            bundle = await self._get(http, url, params)
            if bundle.get("resourceType") != "Bundle" or bundle.get("type") != "searchset":
                raise RecordUnavailable("live: search reply is not a searchset")
            for entry in bundle.get("entry") or []:
                resource = entry.get("resource") or {}
                mode = (entry.get("search") or {}).get("mode", "match")
                if mode == "outcome" or resource.get("resourceType") == "OperationOutcome":
                    if any(i.get("severity") in ("error", "fatal") for i in resource.get("issue") or []):
                        raise RecordUnavailable("live: search outcome error")
                    continue
                if mode != "match":
                    continue
                if resource.get("resourceType") != kind:
                    raise RecordUnavailable("live: unexpected resource type in search")
                found.append(resource)
            nxt = next((link.get("url") for link in bundle.get("link") or [] if link.get("relation") == "next"), None)
            if not nxt:
                return found
            self._check_next(nxt, kind)
            url, params = nxt, None
        raise RecordUnavailable("live: too many search pages")

    def _check_next(self, url: str, kind: str) -> None:
        """Paging links must stay on this store, so the token is never sent anywhere else."""
        b, n = urlsplit(self.base), urlsplit(url)
        if (n.scheme, n.netloc) != (b.scheme, b.netloc) or not n.path.startswith(f"{b.path}/{kind}"):
            raise RecordUnavailable("live: paging link outside the store")
