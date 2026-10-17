"""In-memory Cloud Healthcare FHIR store behind httpx.MockTransport: GET read, search with paging, store config, transaction."""
import copy
import json
import random
from urllib.parse import parse_qs, urlsplit

import httpx

from tests.conftest import ROOT, load_json

STORE = "projects/demo-project/locations/asia-southeast1/datasets/noa/fhirStores/records"
BASE = f"https://healthcare.googleapis.com/v1/{STORE}/fhir"
TOKEN = "test-token-not-real"


def bundle_resources(person_id: str) -> list[dict]:
    return [e["resource"] for e in load_json(ROOT / "data" / "fhir" / f"{person_id}.json")["entry"]]


class FakeStore:
    def __init__(self, resources=(), *, page_size=100, shuffle=False, update_create=True):
        self.resources = {(r["resourceType"], r["id"]): self._stored(r) for r in resources}
        self.page_size, self.shuffle, self.update_create = page_size, shuffle, update_create
        self.fail: dict[str, object] = {}   # resource type or "Patient" -> HTTP status, "json" or an exception
        self.calls: list[tuple[str, str]] = []
        self.next_link: str | None = None   # replaces every next link, to test link checks
        self.endless = False                 # every page links to another one

    def _stored(self, r: dict) -> dict:
        out = copy.deepcopy(r)
        out["meta"] = {**out.get("meta", {}), "versionId": "MTc2MDYwMDAwMDAwMDAwMA", "lastUpdated": "2026-10-17T00:00:00Z"}
        return out

    def add(self, *resources: dict) -> None:
        for r in resources:
            self.resources[(r["resourceType"], r["id"])] = self._stored(r)

    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self.handle)

    def handle(self, request: httpx.Request) -> httpx.Response:
        assert request.headers.get("authorization") == f"Bearer {TOKEN}"
        self.calls.append((request.method, str(request.url)))
        url = urlsplit(str(request.url))
        store_path = urlsplit(BASE).path.removesuffix("/fhir")
        if request.method == "GET" and url.path == store_path:
            return httpx.Response(200, json={"name": STORE, "version": "R4", "enableUpdateCreate": self.update_create})
        assert url.path.startswith(urlsplit(BASE).path), url.path
        parts = url.path.removeprefix(urlsplit(BASE).path).strip("/").split("/")
        if request.method == "POST" and parts == [""]:
            return self._transaction(json.loads(request.content))
        kind = parts[0]
        failure = self.fail.get(kind)
        if isinstance(failure, Exception):
            raise failure
        if failure == "json":
            return httpx.Response(200, content=b"<html>not json</html>")
        if failure == "shape":
            return httpx.Response(200, json={"resourceType": "Bundle", "type": "searchset", "entry": ["not a dict"]})
        if isinstance(failure, int):
            return httpx.Response(failure, json={"resourceType": "OperationOutcome"})
        if len(parts) == 2:
            r = self.resources.get((kind, parts[1]))
            return httpx.Response(200, json=r) if r else httpx.Response(404, json={"resourceType": "OperationOutcome"})
        return self._search(kind, parse_qs(url.query))

    def _search(self, kind: str, query: dict) -> httpx.Response:
        ref = query["patient"][0]
        matches = [r for (k, _), r in sorted(self.resources.items()) if k == kind
                   and any((r.get(f) or {}).get("reference") == ref for f in ("subject", "patient"))]
        if self.shuffle:
            random.Random(7).shuffle(matches)
        page = int(query.get("_page_token", ["0"])[0])
        chunk = matches[page * self.page_size:(page + 1) * self.page_size]
        body = {"resourceType": "Bundle", "type": "searchset", "total": len(matches),
                "entry": [{"fullUrl": f"{BASE}/{kind}/{r['id']}", "resource": r, "search": {"mode": "match"}}
                          for r in chunk],
                "link": [{"relation": "self", "url": f"{BASE}/{kind}/?patient={ref}"}]}
        if (page + 1) * self.page_size < len(matches) or self.endless:
            body["link"].append({"relation": "next", "url": self.next_link
                                 or f"{BASE}/{kind}/?patient={ref}&_count={self.page_size}&_page_token={page + 1}"})
        return httpx.Response(200, json=body)

    def _transaction(self, bundle: dict) -> httpx.Response:
        assert bundle["resourceType"] == "Bundle" and bundle["type"] == "transaction"
        out = []
        for e in bundle["entry"]:
            assert e["request"]["method"] == "PUT" and self.update_create
            self.add(e["resource"])
            out.append({"response": {"status": "201 Created"}})
        return httpx.Response(200, json={"resourceType": "Bundle", "type": "transaction-response", "entry": out})
