"""CLI. Dry run by default: nothing is written and Gemini is not called unless asked.

    python -m predict.run family --person all                  # dry run, summary only
    python -m predict.run family --person margaret --show      # print the document
    python -m predict.run family --person all --gemini --out /tmp/families.json   # generate, review, save
    python -m predict.run family --from /tmp/families.json --write                # re-check that file, then write it

--from never calls Gemini: it rebuilds each document from FHIR and the seed, requires a match apart from the
explanations, re-validates every explanation, and writes only with --write.

AI Predict. BigQuery writes and Firestore writes are separate commands with separate flags:

    python -m predict.run vitals                                   # dry run: 180 rows and the SQL steps
    python -m predict.run vitals --write-bq                        # BigQuery only: staging, conflict check, MERGE
    python -m predict.run forecast                                 # dry run on a local stand-in (never written)
    python -m predict.run forecast --bq-forecast --gemini --out /tmp/forecasts.json   # real AI.FORECAST, save
    python -m predict.run forecast --from /tmp/forecasts.json --write                 # Firestore only
"""
import argparse
import json
import sys
from pathlib import Path

from . import bq, family, forecast, forecast_doc, forecast_review, review, sources, vitals
from .contract import check_forecast_doc
from .explain import gemini_drivers
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


def main(argv: list[str] | None = None, *, db=None, explainer: Explainer | None = None, bq_client=None) -> int:
    ap = argparse.ArgumentParser(prog="predict.run", allow_abbrev=False)  # "--write" must never expand to "--write-bq"
    sub = ap.add_subparsers(dest="job", required=True)
    fam = sub.add_parser("family", allow_abbrev=False, help="families/{personId} from FHIR history and the seed circle")
    fam.add_argument("--person", choices=[*sources.PEOPLE, "all"], default="all")
    fam.add_argument("--gemini", action="store_true", help="add Gemini explanations (Vertex AI call)")
    fam.add_argument("--out", type=Path, help="save the generated documents for review (outside the repo)")
    fam.add_argument("--from", dest="source", type=Path, help="load reviewed documents instead of generating")
    fam.add_argument("--write", action="store_true", help="write Firestore (needs approval)")
    fam.add_argument("--show", action="store_true", help="print each document")
    fam.add_argument("--project", default=PROJECT)
    vit = sub.add_parser("vitals", allow_abbrev=False, help="90-day synthetic vitals into BigQuery noa.vitals_daily")
    vit.add_argument("--person", choices=[*sources.PEOPLE, "all"], default="all")
    vit.add_argument("--write-bq", action="store_true", help="write BigQuery (needs approval); never touches Firestore")
    fc = sub.add_parser("forecast", allow_abbrev=False, help="forecasts/{personId} from AI.FORECAST on systolic blood pressure")
    fc.add_argument("--person", choices=[*sources.PEOPLE, "all"], default="all")
    fc.add_argument("--bq-forecast", action="store_true", help="run the real AI.FORECAST query (billed, read-only)")
    fc.add_argument("--gemini", action="store_true", help="phrase drivers with Gemini (needs --bq-forecast)")
    fc.add_argument("--out", type=Path, help="save the real result for review (outside the repo)")
    fc.add_argument("--from", dest="source", type=Path, help="load a reviewed file instead of generating")
    fc.add_argument("--reuse", type=Path, help="take the forecast points of a reviewed file (no new AI.FORECAST)")
    fc.add_argument("--diagnostics", type=Path, help="save raw Gemini output and per-driver checks (outside the repo)")
    fc.add_argument("--write", action="store_true", help="write Firestore from --from (needs approval)")
    fc.add_argument("--show", action="store_true", help="print each document")
    fc.add_argument("--project", default=PROJECT)
    args = ap.parse_args(argv)
    if args.job == "vitals":
        return _vitals(args, bq_client)
    if args.job == "forecast":
        return _forecast(ap, args, db=db, explainer=explainer, bq_client=bq_client)
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


def _vitals(args, client) -> int:
    people = sources.PEOPLE if args.person == "all" else (args.person,)
    rows = [r for pid in people for r in vitals.generate(pid)]
    try:
        result = bq.load_scoped(client if client is not None or not args.write_bq else bq.bigquery_client(),
                                rows, write=args.write_bq)
    except bq.LoadAborted as e:
        print(f"BigQuery load aborted: {e}", file=sys.stderr)
        return 1
    if result["dryRun"]:
        print(f"DRY RUN: would load {result['rows']} rows for {', '.join(result['people'])} into {bq.TABLE}")
        for step in result["steps"]:
            print(f"  {step}")
    else:
        print(f"BigQuery: {result['inserted']} rows inserted into {bq.TABLE}")
        for step, job_id in result["jobs"]:
            print(f"  job {step}: {job_id}")
        for r in result["readback"]:
            print(f"  read-back {r['person_id']}: {r['n']} rows, {r['first']} to {r['last']}")
    return 0


def _forecast(ap, args, *, db, explainer, bq_client) -> int:
    if args.write and not args.source:
        ap.error("--write writes Firestore only from a reviewed file: use --from")
    if args.source and (args.bq_forecast or args.gemini or args.out):
        ap.error("--from uses the reviewed file as is: it cannot be combined with --bq-forecast, --gemini or --out")
    if args.reuse and (args.bq_forecast or args.source or args.write):
        ap.error("--reuse takes the forecast from a reviewed file: no --bq-forecast, --from or --write")
    if (args.out or args.gemini) and not (args.bq_forecast or args.reuse):
        ap.error("--out and --gemini need a real forecast: add --bq-forecast or --reuse")
    if args.diagnostics and not args.gemini:
        ap.error("--diagnostics records Gemini output: add --gemini")
    people = sources.PEOPLE if args.person == "all" else (args.person,)
    seed = sources.load_seed()
    docs = {}
    if args.source:
        source, entries, problems = forecast_review.load(args.source, seed)
        print(f"review file {args.source} sha256 {forecast_review.sha256(args.source) if args.source.is_file() else '-'}")
        entries = [e for e in entries if e["personId"] in people]
        if not problems and {e["personId"] for e in entries} != set(people):
            problems = [f"file does not hold every requested person: {sorted(people)}"]
        if not problems and args.write:
            problems = forecast_review.job_problems(bq_client or bq.bigquery_client(args.project), source, entries)
        if problems:
            print("review file rejected, nothing written:\n  " + "\n  ".join(problems), file=sys.stderr)
            return 1
        print(f"forecast source: BigQuery job {source['jobId']} ({source['location']})")
        docs = {e["personId"]: e["doc"] for e in entries}
    else:
        rows = {pid: vitals.generate(pid) for pid in people}
        if args.reuse:
            points, source, problems = _reused_forecast(args.reuse, seed, people, bq_client, args.project)
            if problems:
                print("forecast file rejected:\n  " + "\n  ".join(problems), file=sys.stderr)
                return 1
            print(f"reusing AI.FORECAST job {source['jobId']} from {args.reuse} "
                  f"(sha256 {forecast_review.sha256(args.reuse)}); no new forecast query")
        elif args.bq_forecast:
            points, source = forecast.run_forecast(bq_client or bq.bigquery_client(args.project), people)
        else:
            points, source = forecast.stand_in(rows)
        explainer = explainer or (GeminiExplainer() if args.gemini else NoExplainer())
        outs, diagnostics = {}, {}
        for pid in people:
            resources = sources.load_bundle(pid)
            f = forecast_doc.facts(pid, rows[pid], points[pid], resources)
            proposed = gemini_drivers(explainer, forecast_doc.DRIVER_PROMPT, forecast_doc.driver_facts(f))
            diagnostics[pid] = {"raw": proposed, "drivers": forecast_doc.diagnose_drivers(f, proposed)}
            for d in diagnostics[pid]["drivers"]:
                if args.gemini:
                    print(f"  {pid} {d['kind']}: {'accepted' if d['accepted'] else 'rejected: ' + str(d['reason'])}")
            out = forecast_doc.build(pid, rows[pid], points[pid], resources, seed, proposed)
            if problems := check_forecast_doc(out["doc"]):
                print(f"forecasts/{pid}: contract check failed: {problems}", file=sys.stderr)
                return 1
            outs[pid] = out
            docs[pid] = out["doc"]
            print(f"forecasts/{pid}: risk {out['doc']['risks'][0]['level']}, {out['driversFromModel']}/3 drivers "
                  f"from Gemini, {sum('systolic' in p for p in out['doc']['series'])} observed + "
                  f"{sum('systolicForecast' in p for p in out['doc']['series'])} forecast points")
        if source["kind"] == forecast.STAND_IN:
            print("LOCAL STAND-IN forecast (not AI.FORECAST): for checking the pipeline only, never written")
        else:
            print(f"AI.FORECAST job {source['jobId']} ({source['location']})")
        if isinstance(explainer, GeminiExplainer):
            print(f"gemini: {explainer.calls} calls, {explainer.rejected} failed")
        if args.diagnostics:
            target = args.diagnostics.resolve()
            if target.is_relative_to(sources.REPO.resolve()):
                print("diagnostics must be saved outside the repository", file=sys.stderr)
                return 2
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps({"prompt": forecast_doc.DRIVER_PROMPT, "people": diagnostics},
                                         ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"diagnostics saved to {args.diagnostics}")
        if args.out:
            extra = {"reusedForecastFrom": {"file": str(args.reuse), "sha256": forecast_review.sha256(args.reuse)}} \
                if args.reuse else {}
            try:
                digest = forecast_review.save(args.out, outs, source, project=args.project,
                                              model=getattr(explainer, "model", None), extra=extra)
            except ValueError as e:
                print(str(e), file=sys.stderr)
                return 2
            print(f"saved {args.out} sha256 {digest}")
    if args.write and db is None:
        db = firestore_client(args.project)
    for pid, doc in docs.items():
        if args.show:
            print(json.dumps(doc, ensure_ascii=False, indent=2))
        print(write_doc(db, "forecasts", pid, doc, write=args.write))
    return 0


def _reused_forecast(path, seed, people, bq_client, project):
    """Forecast points from a reviewed file, after the full review checks and the BigQuery job metadata check."""
    source, entries, problems = forecast_review.load(path, seed)
    if not problems:
        problems = forecast_review.job_problems(bq_client or bq.bigquery_client(project), source, entries)
    held = {e["personId"]: e for e in entries}
    if not problems and not set(people) <= set(held):
        problems = [f"file does not hold every requested person: {sorted(people)}"]
    points = {pid: forecast_review._points(held[pid]["doc"]) for pid in people} if not problems else {}
    return points, source, problems


if __name__ == "__main__":
    sys.exit(main())
