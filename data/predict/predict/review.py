"""Reviewed output: save the exact documents a dry run produced, and re-check a saved file before it is written.

A saved file is never trusted. Loading rebuilds each document from FHIR and the seed (no Gemini), requires it to
match apart from explanations, and re-validates every explanation against the recomputed facts.
"""
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from . import family, sources
from .contract import check_family_doc
from .explain import validate

KIND = "families-review"


def sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def outside_repo(path: Path) -> bool:
    return not Path(path).resolve().is_relative_to(sources.REPO.resolve())


def save(path: Path, outs: dict[str, dict], *, project: str, model: str | None) -> str:
    """Writes the review file (outside the repo, so it is never committed) and returns its SHA-256."""
    path = Path(path)
    if not outside_repo(path):
        raise ValueError("review files must be saved outside the repository")
    payload = {
        "kind": KIND, "version": 1, "project": project, "model": model,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "documents": [{"personId": pid, "path": f"families/{pid}", "doc": out["doc"], "sources": out["sources"]}
                      for pid, out in outs.items()],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return sha256(path)


def _without_explanations(doc: dict) -> dict:
    doc = copy.deepcopy(doc)
    for f in doc.get("flags") or []:
        f.pop("explanation", None)
    return doc


def verify(entry: dict, seed: dict) -> list[str]:
    """Problems with one saved document; an empty list means it may be written to entry['path']."""
    pid = entry.get("personId")
    if pid not in sources.PEOPLE:
        return [f"unknown personId {pid!r}"]
    if entry.get("path") != f"families/{pid}":
        return [f"{pid}: path must be families/{pid}, got {entry.get('path')!r}"]
    doc = entry.get("doc")
    if not isinstance(doc, dict):
        return [f"{pid}: doc missing"]
    problems = [f"{pid}: {p}" for p in check_family_doc(doc)]
    if problems:
        return problems
    selves = [m["id"] for m in doc["members"] if m["relation"] == "self"]
    if selves != [pid]:
        return [f"{pid}: the self member is {selves}, not {pid} (wrong person's document?)"]
    fresh = family.build_family(pid, sources.load_bundle(pid), seed)
    if _without_explanations(doc) != fresh["doc"]:
        return [f"{pid}: members or flags differ from what FHIR and the seed give today"]
    for f in doc["flags"]:
        if "explanation" not in f:
            continue
        facts = fresh["facts"][(f["memberId"], f["screening"])]
        if validate(f["explanation"], facts, (f["screening"].lower(),)) != " ".join(f["explanation"].split()):
            problems.append(f"{pid}: explanation for {f['memberId']} / {f['screening']} is not grounded in the facts")
    return problems


def load(path: Path, seed: dict) -> tuple[list[dict], list[str]]:
    """(entries, problems). Entries are only usable when problems is empty."""
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return [], [f"cannot read review file: {type(e).__name__}"]
    if not isinstance(payload, dict) or payload.get("kind") != KIND or payload.get("version") != 1:
        return [], ["not a families review file (kind/version)"]
    entries = payload.get("documents") or []
    ids = [e.get("personId") for e in entries if isinstance(e, dict)]
    if len(ids) != len(entries) or len(set(ids)) != len(ids):
        return [], ["each person may appear once"]
    problems = [p for e in entries for p in verify(e, seed)]
    return entries, problems
