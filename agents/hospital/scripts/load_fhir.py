"""Load the synthetic bundles in data/fhir into the Cloud Healthcare FHIR store. Dry run unless --write.

Insert-only and idempotent: a resource already in the store with the same content is skipped (no new
version); one with different content aborts the whole load before anything is written. Missing resources
go in one atomic transaction Bundle. --verify (read-only) checks that live and fixture reads give the
same resources and the same packets for every person.

    .venv/bin/python scripts/load_fhir.py --store projects/P/locations/L/datasets/D/fhirStores/S            # dry run
    .venv/bin/python scripts/load_fhir.py --store ... --write                                              # load, then verify
    .venv/bin/python scripts/load_fhir.py --store ... --verify                                             # read-only check
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from handoff import pipeline  # noqa: E402
from handoff.fhir import DEFAULT_DIR, PERSON_ID, FixtureReader  # noqa: E402
from handoff.live import AdcTokens, HealthcareReader, api_base, store_name  # noqa: E402

PEOPLE = ("ba-mai", "margaret")
HTEST = ("http://terminology.hl7.org/CodeSystem/v3-ActReason", "HTEST")
VERIFY_AT = datetime(2026, 10, 15, 19, 7, tzinfo=timezone.utc)


class LoadAborted(Exception):
    """Stopped before writing; the store is unchanged."""


def load_bundle(person_id: str, directory: Path = DEFAULT_DIR) -> dict:
    return json.loads((Path(directory) / f"{person_id}.json").read_text(encoding="utf-8"))


def _references(value) -> list[str]:
    if isinstance(value, dict):
        own = [value["reference"]] if isinstance(value.get("reference"), str) else []
        return own + [r for k, v in value.items() if k != "reference" for r in _references(v)]
    if isinstance(value, list):
        return [r for v in value for r in _references(v)]
    return []


def problems(bundle: dict, person_id: str) -> list[str]:
    """Checks that make a bundle safe to load: synthetic, ours, self-contained and replayable."""
    out = []
    if bundle.get("resourceType") != "Bundle" or bundle.get("type") != "transaction":
        return ["not a transaction Bundle"]
    refs = {f'{e["resource"]["resourceType"]}/{e["resource"].get("id")}' for e in bundle.get("entry", [])}
    if f"Patient/{person_id}" not in refs:
        out.append(f"no Patient/{person_id}")
    for e in bundle.get("entry", []):
        r = e["resource"]
        here = f'{r["resourceType"]}/{r.get("id")}'
        rid = r.get("id") or ""
        if not PERSON_ID.fullmatch(rid) or not (rid == person_id or rid.startswith(person_id + "-")):
            out.append(f"{here}: id is not {person_id} or {person_id}-*")
        if e.get("request") != {"method": "PUT", "url": here} or e.get("fullUrl") != here:
            out.append(f"{here}: entry must be PUT {here}")
        if not any((t.get("system"), t.get("code")) == HTEST for t in (r.get("meta") or {}).get("tag") or []):
            out.append(f"{here}: missing HTEST tag")
        if r["resourceType"] == "Patient" and "birthDate" in r:
            out.append(f"{here}: has birthDate")
        out += [f"{here}: reference {x} not in bundle" for x in _references(r) if x not in refs]
    return out


def _content(r: dict) -> dict:
    return {k: v for k, v in r.items() if k != "meta"}


def plan(http: httpx.Client, base: str, bundle: dict) -> list[tuple[str, dict]]:
    """(CREATE | SAME | CONFLICT, entry) per entry, from read-only GETs."""
    out = []
    for e in bundle["entry"]:
        r = e["resource"]
        got = http.get(f'{base}/{r["resourceType"]}/{r["id"]}')
        if got.status_code in (404, 410):
            out.append(("CREATE", e))
        elif got.status_code == 200:
            out.append(("SAME" if _content(got.json()) == _content(r) else "CONFLICT", e))
        else:
            raise LoadAborted(f'reading {r["resourceType"]}/{r["id"]} returned HTTP {got.status_code}')
    return out


def write(http: httpx.Client, base: str, steps: list[tuple[str, dict]]) -> int:
    conflicts = [f'{e["resource"]["resourceType"]}/{e["resource"]["id"]}' for s, e in steps if s == "CONFLICT"]
    if conflicts:
        raise LoadAborted(f"{len(conflicts)} resources differ from ours in the store ({', '.join(conflicts)}); "
                          "nothing was written")
    entries = [e for s, e in steps if s == "CREATE"]
    if not entries:
        return 0
    store = base.removesuffix("/fhir")
    config = http.get(store)
    if config.status_code != 200:
        raise LoadAborted(f"reading the store config returned HTTP {config.status_code}; nothing was written")
    if config.json().get("enableUpdateCreate") is not True:
        raise LoadAborted("the store does not allow PUT with client ids (enableUpdateCreate is off); nothing was written")
    r = http.post(base, json={"resourceType": "Bundle", "type": "transaction", "entry": entries},
                  headers={"Content-Type": "application/fhir+json"})
    if r.status_code != 200:
        raise LoadAborted(f"transaction returned HTTP {r.status_code}; a transaction is atomic, so nothing was written")
    statuses = [(x.get("response") or {}).get("status", "") for x in r.json().get("entry", [])]
    if len(statuses) != len(entries) or not all(s.startswith(("200", "201")) for s in statuses):
        raise LoadAborted(f"unexpected transaction response: {statuses}")
    return len(entries)


def verify_request(person_id: str) -> dict:
    return {"incidentId": "load-fhir-verify", "personId": person_id, "level": "EMERGENCY", "suspected": "STROKE",
            "lastKnownWellAt": "2026-10-15T18:55:00Z", "findings": [],
            "hospital": {"id": "verify", "name": "verify", "etaMin": 10}}


async def verify(reader: HealthcareReader, people=PEOPLE, fixture: FixtureReader | None = None) -> list[str]:
    """Live and fixture must give the same resources (ignoring store meta) and the same packet."""
    fixture = fixture or FixtureReader()
    out = []
    for p in people:
        live, local = await reader.read(p), await fixture.read(p)
        key = lambda r: f'{r["resourceType"]}/{r["id"]}'  # noqa: E731
        if sorted(map(_content, live), key=key) != sorted(map(_content, local), key=key):
            out.append(f"{p}: live resources differ from the fixture ({len(live)} live, {len(local)} fixture)")
            continue
        _, a = await pipeline.handle(verify_request(p), reader=reader, now=VERIFY_AT)
        _, b = await pipeline.handle(verify_request(p), reader=fixture, now=VERIFY_AT)
        if a != b:
            out.append(f"{p}: live packet differs from the fixture packet")
        elif a.get("status") != "COMPLETED":
            out.append(f"{p}: packet status {a.get('status')}")
    return out


def main(argv=None, *, token_provider=None, transport=None, async_transport=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0], allow_abbrev=False)
    ap.add_argument("--store", default=os.environ.get("FHIR_STORE"), help="full FHIR store resource name")
    ap.add_argument("--api-base", default=os.environ.get("FHIR_API_BASE"))
    ap.add_argument("--person", action="append", choices=PEOPLE, help="default: both")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="load missing resources, then verify")
    mode.add_argument("--verify", action="store_true", help="read-only live versus fixture check")
    a = ap.parse_args(argv)
    try:
        store, base_url = store_name(a.store), api_base(a.api_base)
    except RuntimeError as e:
        print(e, file=sys.stderr)
        return 2
    people = tuple(a.person or PEOPLE)
    base = f"{base_url}/{store}/fhir"
    tokens = token_provider or AdcTokens()
    reader = HealthcareReader(store, base=base_url, token_provider=tokens, transport=async_transport)
    if a.verify:
        bad = asyncio.run(verify(reader, people))
        print("\n".join(bad) or f"VERIFIED live equals fixture for {', '.join(people)}")
        return 1 if bad else 0
    bundles = {p: load_bundle(p) for p in people}
    bad = [f"{p}: {x}" for p, b in bundles.items() for x in problems(b, p)]
    if bad:
        print("\n".join(bad), file=sys.stderr)
        return 1
    try:
        with httpx.Client(transport=transport, headers={"Authorization": f"Bearer {tokens()}"},
                          timeout=30, follow_redirects=False) as http:
            steps = [s for p in people for s in plan(http, base, bundles[p])]
            for s, e in steps:
                print(f'{s:8} {e["resource"]["resourceType"]}/{e["resource"]["id"]}')
            if not a.write:
                n = sum(s == "CREATE" for s, _ in steps)
                print(f"DRY RUN: would create {n} of {len(steps)} resources in {store}; nothing written")
                return 1 if any(s == "CONFLICT" for s, _ in steps) else 0
            print(f"WROTE {write(http, base, steps)} resources")
    except LoadAborted as e:
        print(f"aborted: {e}", file=sys.stderr)
        return 1
    bad = asyncio.run(verify(reader, people))
    if bad:
        bad.append("search can lag a fresh write: rerun --verify in a few seconds")
    print("\n".join(bad) or f"VERIFIED live equals fixture for {', '.join(people)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
