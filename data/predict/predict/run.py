"""CLI. Dry run by default: nothing is written and Gemini is not called unless asked.

    python -m predict.run family --person all                  # dry run, summary only
    python -m predict.run family --person margaret --show      # print the document
    python -m predict.run family --person all --gemini --out /tmp/families.json   # generate, review, save
    python -m predict.run family --from /tmp/families.json --write                # re-check that file, then write it

--from never calls Gemini: it rebuilds each document from FHIR and the seed, requires a match apart from the
explanations, re-validates every explanation, and writes only with --write.
"""
import argparse
import json
import sys
from pathlib import Path

from . import family, review, sources
from .contract import check_family_doc
from .explain import Explainer, GeminiExplainer, NoExplainer
from .firestore_out import firestore_client, write_doc

PROJECT = "no-one-alone-511616"
FLAG_PROMPT = ("Write one or two short, plain-language sentences for {name} explaining why a {screening} is suggested. "
               "Use only the facts below. A relative marked (deceased) has died: use the past tense for them (\"had\", not "
               "\"has\"). Do not say whether any other relative is alive or has died. Do not diagnose, do not give "
               "probabilities or percentages, do not add relatives or conditions. "
               "Return JSON {{\"explanation\": \"...\"}}.")


def family_doc(person_id: str, explainer: Explainer, seed: dict | None = None) -> dict:
    seed = seed or sources.load_seed()
    out = family.build_family(person_id, sources.load_bundle(person_id), seed)
    names = {m["id"]: m["name"] for m in out["doc"]["members"]}
    for flag in out["doc"]["flags"]:
        facts = out["facts"][(flag["memberId"], flag["screening"])]
        text = explainer.explain(FLAG_PROMPT.format(name=names[flag["memberId"]], screening=flag["screening"].lower()),
                                 facts, allowed_terms=(flag["screening"].lower(),))
        if text:
            flag["explanation"] = text
    return out


def _summary(pid: str, doc: dict, n_sources: int) -> str:
    explained = sum("explanation" in f for f in doc["flags"])
    return (f"families/{pid}: {len(doc['members'])} members, {len(doc['flags'])} flags, {explained} explained, "
            f"{n_sources} FHIR sources")


def main(argv: list[str] | None = None, *, db=None, explainer: Explainer | None = None) -> int:
    ap = argparse.ArgumentParser(prog="predict.run")
    sub = ap.add_subparsers(dest="job", required=True)
    fam = sub.add_parser("family", help="families/{personId} from FHIR history and the seed circle")
    fam.add_argument("--person", choices=[*sources.PEOPLE, "all"], default="all")
    fam.add_argument("--gemini", action="store_true", help="add Gemini explanations (Vertex AI call)")
    fam.add_argument("--out", type=Path, help="save the generated documents for review (outside the repo)")
    fam.add_argument("--from", dest="source", type=Path, help="load reviewed documents instead of generating")
    fam.add_argument("--write", action="store_true", help="write Firestore (needs approval)")
    fam.add_argument("--show", action="store_true", help="print each document")
    fam.add_argument("--project", default=PROJECT)
    args = ap.parse_args(argv)
    if args.source and (args.gemini or args.out):
        ap.error("--from uses the reviewed file as is: it cannot be combined with --gemini or --out")

    people = sources.PEOPLE if args.person == "all" else (args.person,)
    seed = sources.load_seed()
    docs: dict[str, tuple[dict, int]] = {}
    if args.source:
        entries, problems = review.load(args.source, seed)
        print(f"review file {args.source} sha256 {review.sha256(args.source) if args.source.is_file() else '-'}")
        entries = [e for e in entries if e["personId"] in people]
        if not problems and {e["personId"] for e in entries} != set(people):
            problems = [f"file does not hold every requested person: {sorted(people)}"]
        if problems:
            print("review file rejected, nothing written:\n  " + "\n  ".join(problems), file=sys.stderr)
            return 1
        for e in entries:
            docs[e["personId"]] = (e["doc"], len(e.get("sources") or []))
    else:
        explainer = explainer or (GeminiExplainer() if args.gemini else NoExplainer())
        outs = {}
        for pid in people:
            out = family_doc(pid, explainer, seed)
            problems = check_family_doc(out["doc"])
            if problems:
                print(f"families/{pid}: contract check failed: {problems}", file=sys.stderr)
                return 1
            outs[pid] = out
            docs[pid] = (out["doc"], len(out["sources"]))
        if isinstance(explainer, GeminiExplainer):
            print(f"gemini: {explainer.calls} calls, {explainer.rejected} rejected or failed")
        if args.out:
            try:
                digest = review.save(args.out, outs, project=args.project,
                                     model=getattr(explainer, "model", None))
            except ValueError as e:
                print(str(e), file=sys.stderr)
                return 2
            print(f"saved {args.out} sha256 {digest}")

    if args.write and db is None:
        db = firestore_client(args.project)
    for pid, (doc, n_sources) in docs.items():
        print(_summary(pid, doc, n_sources))
        if args.show:
            print(json.dumps(doc, ensure_ascii=False, indent=2))
        print(write_doc(db, "families", pid, doc, write=args.write))
    return 0


if __name__ == "__main__":
    sys.exit(main())
