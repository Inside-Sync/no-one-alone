"""families/{personId} (contract 2.5) from FHIR history and the seed circle, with rule-based screening flags.

Medical history comes only from the FHIR bundle (FamilyMemberHistory, confirmed active Conditions).
Relationships come only from the core-api seed. Nothing is invented: unnamed relatives get a relation label.
"""
import re

SNOMED = "http://snomed.info/sct"
STROKE, HTN, T2D, PREDIABETES = "stroke", "hypertension", "type 2 diabetes", "prediabetes"
KIND_BY_SNOMED = {"230690007": STROKE, "38341003": HTN, "44054006": T2D, "714628002": PREDIABETES}
KIND_BY_TEXT = [(re.compile(r"stroke|cerebrovascular", re.I), STROKE), (re.compile(r"hypertens", re.I), HTN),
                (re.compile(r"type 2 diabetes|diabetes mellitus type 2", re.I), T2D), (re.compile(r"prediabet", re.I), PREDIABETES)]

PARENT_ROLE = {"FTH": "father", "MTH": "mother"}
SIBLINGS = {"brother", "sister"}
CHILDREN = {"son", "daughter"}
# Named relatives; any other relative without a name keeps its relation label.
CONTRACT_NAMES = {"ba-mai-father": ("ong-tu", "Ông Tư")}

BP_CHECK, SUGAR_TEST = "Blood pressure check", "Blood sugar test"
SCREENINGS = [(BP_CHECK, {STROKE, HTN}), (SUGAR_TEST, {T2D, PREDIABETES})]


def _label(cc: dict | None) -> str | None:
    cc = cc or {}
    return cc.get("text") or next((c["display"] for c in cc.get("coding") or [] if c.get("display")), None)


def _kind(cc: dict | None) -> str | None:
    for c in (cc or {}).get("coding") or []:
        if c.get("system") == SNOMED and c.get("code") in KIND_BY_SNOMED:
            return KIND_BY_SNOMED[c["code"]]
    label = _label(cc) or ""
    return next((k for rx, k in KIND_BY_TEXT if rx.search(label)), None)


def _code(cc: dict | None) -> str | None:
    coding = (cc or {}).get("coding") or []
    return coding[0].get("code") if coding else None


def _self_conditions(resources: list[dict], person_id: str) -> list[dict]:
    """Confirmed, active Conditions only: provisional diagnoses never enter the family tree."""
    out = []
    for r in sorted((r for r in resources if r["resourceType"] == "Condition"), key=lambda r: r["id"]):
        if (r.get("subject") or {}).get("reference") != f"Patient/{person_id}":
            continue
        if _code(r.get("clinicalStatus")) not in ("active", "recurrence", "relapse"):
            continue
        if _code(r.get("verificationStatus")) != "confirmed":
            continue
        if label := _label(r.get("code")):
            out.append({"label": label, "kind": _kind(r.get("code")), "ref": f'Condition/{r["id"]}'})
    return out


def _deceased(r: dict) -> bool:
    """True only when FHIR records the death: deceasedBoolean true, or a deceased age, date, range or note."""
    return r.get("deceasedBoolean") is True or any(
        r.get(k) not in (None, "", {}) for k in ("deceasedAge", "deceasedDate", "deceasedRange", "deceasedString"))


def _parents(resources: list[dict], person_id: str) -> list[dict]:
    out = []
    for r in sorted((r for r in resources if r["resourceType"] == "FamilyMemberHistory"), key=lambda r: r["id"]):
        if r.get("status") == "entered-in-error" or (r.get("patient") or {}).get("reference") != f"Patient/{person_id}":
            continue
        role = PARENT_ROLE.get(_code(r.get("relationship")))
        if not role:
            continue  # only parents are placed in the tree; other relation codes are skipped, not guessed
        conditions = []
        for c in r.get("condition") or []:
            if label := _label(c.get("code")):
                item = {"label": label, "kind": _kind(c.get("code"))}
                if isinstance((c.get("onsetAge") or {}).get("value"), int):
                    item["ageAtOnset"] = c["onsetAge"]["value"]
                conditions.append(item)
        member_id, name = CONTRACT_NAMES.get(r["id"], (r["id"], role.capitalize()))
        out.append({"id": member_id, "name": name, "relation": role, "deceased": _deceased(r),
                    "conditions": conditions, "ref": f'FamilyMemberHistory/{r["id"]}'})
    return out


def _public(c: dict) -> dict:
    return {k: c[k] for k in ("label", "ageAtOnset") if k in c}


def _fmt(c: dict) -> str:
    return c["label"] + (f' at {c["ageAtOnset"]}' if "ageAtOnset" in c else "")


def _fact(relation: str, c: dict, deceased: bool) -> str:
    """'grandfather (deceased): stroke at 74'. Deceased only when FHIR says so; living or unknown carry no marker."""
    return f"{relation}{' (deceased)' if deceased else ''}: {_fmt(c)}"


def _reason(facts: list[tuple[str, dict, bool]], kinds: set[str]) -> str | None:
    """'mother: hypertension; grandfather: stroke at 74', limited to the conditions behind this screening."""
    by_rel: dict[str, list[dict]] = {}
    for rel, c, _ in facts:
        if c["kind"] in kinds:
            by_rel.setdefault(rel, []).append(c)
    if not by_rel:
        return None
    text = "; ".join(f'{rel}: {", ".join(_fmt(c) for c in cs)}' for rel, cs in by_rel.items())
    return text[0].upper() + text[1:]


def build_family(person_id: str, resources: list[dict], seed: dict) -> dict:
    """Returns {"doc": FamilyDoc, "facts": {(memberId, screening): [fact strings]}, "sources": [FHIR refs used]}."""
    people = seed["people"]
    person = people[person_id]
    patient = next(r for r in resources if r["resourceType"] == "Patient" and r["id"] == person_id)
    self_role = {"female": "mother", "male": "father"}.get(patient.get("gender"), "parent")
    self_conditions = _self_conditions(resources, person_id)
    parents = _parents(resources, person_id)
    father = next((p for p in parents if p["relation"] == "father"), None)

    members = []
    for p in parents:
        m = {"id": p["id"], "name": p["name"], "relation": p["relation"], "generation": 0,
             "conditions": [_public(c) for c in p["conditions"]]}
        if p["deceased"]:
            m["deceased"] = True
        members.append(m)
    me = {"id": person_id, "name": person["displayName"], "relation": "self", "generation": 1,
          "conditions": [_public(c) for c in self_conditions]}
    if father:
        me["parentId"] = father["id"]
    members.append(me)

    # Blood relatives from the seed circle; neighbours and other non-family roles are left out.
    relatives = []
    for entry in person.get("circle") or []:
        rel = entry.get("relation")
        if rel in SIBLINGS or rel in CHILDREN:
            m = {"id": entry["memberId"], "name": people[entry["memberId"]]["displayName"], "relation": rel,
                 "generation": 1 if rel in SIBLINGS else 2, "conditions": []}
            if rel in CHILDREN:
                m["parentId"] = person_id
            elif father:
                m["parentId"] = father["id"]
            relatives.append(m)
    members.extend(relatives)

    flags, facts = [], {}
    for m in relatives:
        if m["relation"] in CHILDREN:
            # The person herself is the living subject of the record, so she is never marked deceased.
            history = [(self_role, c, False) for c in self_conditions]
            history += [("grand" + p["relation"], c, p["deceased"]) for p in parents for c in p["conditions"]]
        else:
            history = [(p["relation"], c, p["deceased"]) for p in parents for c in p["conditions"]]
        for screening, kinds in SCREENINGS:
            if reason := _reason(history, kinds):
                flags.append({"memberId": m["id"], "screening": screening, "reason": reason})
                facts[(m["id"], screening)] = [_fact(rel, c, dead) for rel, c, dead in history if c["kind"] in kinds]

    sources = sorted({f"Patient/{person_id}"} | {p["ref"] for p in parents} | {c["ref"] for c in self_conditions})
    return {"doc": {"members": members, "flags": flags}, "facts": facts, "sources": sources}
