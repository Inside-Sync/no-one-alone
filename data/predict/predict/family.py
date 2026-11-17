"""families/{personId} (contract 2.5) from FHIR history and the seed circle, with rule-based screening flags.

Medical history comes only from the FHIR bundle (FamilyMemberHistory, confirmed active Conditions).
The tree (parents, husband, siblings, children, grandchildren, with names, ages and places) comes from FHIR; the
core-api seed adds blood relatives of the circle that have no FHIR record. Nothing is invented.
"""
import re
from datetime import date

from .vitals import AS_OF

SNOMED = "http://snomed.info/sct"
STROKE, HTN, T2D, PREDIABETES = "stroke", "hypertension", "type 2 diabetes", "prediabetes"
KIND_BY_SNOMED = {"230690007": STROKE, "38341003": HTN, "44054006": T2D, "714628002": PREDIABETES}
KIND_BY_TEXT = [(re.compile(r"stroke|cerebrovascular", re.I), STROKE), (re.compile(r"hypertens", re.I), HTN),
                (re.compile(r"type 2 diabetes|diabetes mellitus type 2", re.I), T2D), (re.compile(r"prediabet", re.I), PREDIABETES)]

# The `code` the web reads next to each condition label, so it need not match words in any language. SNOMED first, then
# the label's words; a condition that is in neither list gets no code.
CODE_BY_SNOMED = {"230690007": "STROKE", "38341003": "HYPERTENSION", "44054006": "TYPE_2_DIABETES", "714628002": "PREDIABETES",
                  "52448006": "DEMENTIA", "15188001": "HEARING_LOSS", "700378005": "CHRONIC_KIDNEY_DISEASE",
                  "239873007": "OSTEOARTHRITIS"}
CODE_BY_TEXT = [(re.compile(r"stroke|cerebrovascular", re.I), "STROKE"), (re.compile(r"hypertens|blood pressure", re.I), "HYPERTENSION"),
                (re.compile(r"atrial|fibrillation", re.I), "ATRIAL_FIBRILLATION"),
                (re.compile(r"type 2 diabetes|diabetes mellitus type 2", re.I), "TYPE_2_DIABETES"), (re.compile(r"prediabet", re.I), "PREDIABETES"),
                (re.compile(r"glaucoma", re.I), "GLAUCOMA"), (re.compile(r"dementia|alzheimer", re.I), "DEMENTIA"),
                (re.compile(r"hearing", re.I), "HEARING_LOSS"), (re.compile(r"kidney", re.I), "CHRONIC_KIDNEY_DISEASE"),
                (re.compile(r"osteoarthritis", re.I), "OSTEOARTHRITIS")]

# v3-RoleCode -> (relation, generation). The order is the order of members inside the tree.
ROLES = {"FTH": ("father", 0), "MTH": ("mother", 0), "HUSB": ("husband", 1), "WIFE": ("wife", 1), "BRO": ("brother", 1),
         "SIS": ("sister", 1), "DAU": ("daughter", 2), "SON": ("son", 2), "GRNDDAU": ("granddaughter", 3), "GRNDSON": ("grandson", 3)}
PARENTS = {"father", "mother"}
SPOUSES = {"husband": "father", "wife": "mother"}  # value: what the children call the spouse
SIBLINGS = {"brother", "sister"}
CHILDREN = {"son", "daughter"}
GRANDCHILDREN = {"grandson", "granddaughter"}
STATED_AGE_URL = "https://noonealone.insidesync.ai/fhir/StructureDefinition/synthetic-stated-age"
RESIDENCE_URL = "https://noonealone.insidesync.ai/fhir/StructureDefinition/residence"
# FHIR record id -> seed circle member id, for relatives who are also in the circle. Names come from FHIR.
CONTRACT_IDS = {"margaret-brother": "david", "margaret-son": "james", "margaret-daughter": "sarah"}

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


def _condition_code(cc: dict | None) -> str | None:
    for c in (cc or {}).get("coding") or []:
        if c.get("system") == SNOMED and c.get("code") in CODE_BY_SNOMED:
            return CODE_BY_SNOMED[c["code"]]
    label = _label(cc) or ""
    return next((code for rx, code in CODE_BY_TEXT if rx.search(label)), None)


def _code(cc: dict | None) -> str | None:
    coding = (cc or {}).get("coding") or []
    return coding[0].get("code") if coding else None


def _years(a: dict | None) -> int | None:
    """Whole years of a FHIR Age (onsetAge, ageAge, deceasedAge)."""
    value = (a or {}).get("value")
    return value if isinstance(value, int) and not isinstance(value, bool) else None


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
            item = {"label": label, "kind": _kind(r.get("code")), "code": _condition_code(r.get("code")),
                    "ref": f'Condition/{r["id"]}'}
            if (onset := _years(r.get("onsetAge"))) is not None:
                item["ageAtOnset"] = onset
            out.append(item)
    # Conditions with a known onset first, oldest onset first, so the tree reads as a history; the rest keep id order.
    return sorted(out, key=lambda c: (c.get("ageAtOnset") is None, c.get("ageAtOnset") or 0))


def _deceased(r: dict) -> bool:
    """True only when FHIR records the death: deceasedBoolean true, or a deceased age, date, range or note."""
    return r.get("deceasedBoolean") is True or any(
        r.get(k) not in (None, "", {}) for k in ("deceasedAge", "deceasedDate", "deceasedRange", "deceasedString"))


def _residence(r: dict) -> str | None:
    return next((e["valueString"] for e in r.get("extension") or [] if e.get("url") == RESIDENCE_URL and e.get("valueString")), None)


def _relatives(resources: list[dict], person_id: str) -> list[dict]:
    """Every usable FamilyMemberHistory, in tree order. Unknown relation codes are skipped, not guessed."""
    out = []
    for r in sorted((r for r in resources if r["resourceType"] == "FamilyMemberHistory"), key=lambda r: r["id"]):
        if r.get("status") == "entered-in-error" or (r.get("patient") or {}).get("reference") != f"Patient/{person_id}":
            continue
        role = ROLES.get(_code(r.get("relationship")))
        if not role:
            continue
        conditions = []
        for c in r.get("condition") or []:
            if label := _label(c.get("code")):
                item = {"label": label, "kind": _kind(c.get("code")), "code": _condition_code(c.get("code"))}
                if (onset := _years(c.get("onsetAge"))) is not None:
                    item["ageAtOnset"] = onset
                if note := ((c.get("note") or [{}])[0].get("text")):
                    item["note"] = note
                conditions.append(item)
        relation, generation = role
        name = r["name"] if isinstance(r.get("name"), str) and r["name"] else relation.capitalize()
        out.append({"id": CONTRACT_IDS.get(r["id"], r["id"]), "name": name, "relation": relation, "generation": generation,
                    "deceased": _deceased(r), "conditions": conditions, "age": _years(r.get("ageAge")),
                    "deceasedAge": _years(r.get("deceasedAge")), "place": _residence(r), "ref": f'FamilyMemberHistory/{r["id"]}'})
    order = list(ROLES.values())
    return sorted(out, key=lambda p: order.index((p["relation"], p["generation"])))


def _patient_age(patient: dict) -> int | None:
    """Whole years on the story date from a full birth date, else the bundle's stated age (the bundles carry no birth date)."""
    birth = patient.get("birthDate") or ""
    if len(birth) == 10:
        b = date.fromisoformat(birth)
        return AS_OF.year - b.year - ((AS_OF.month, AS_OF.day) < (b.month, b.day))
    return next((_years(e.get("valueAge")) for e in patient.get("extension") or [] if e.get("url") == STATED_AGE_URL), None)


def _public(c: dict) -> dict:
    return {k: c[k] for k in ("label", "ageAtOnset", "code", "note") if c.get(k) is not None}


def _member(p: dict) -> dict:
    m = {k: p[k] for k in ("id", "name", "relation", "generation")}
    m["conditions"] = [_public(c) for c in p["conditions"]]
    if p["deceased"]:
        m["deceased"] = True
    m.update({k: p[k] for k in ("age", "deceasedAge", "place") if p[k] is not None})
    return m


def _fmt(c: dict) -> str:
    return c["label"] + (f' at {c["ageAtOnset"]}' if "ageAtOnset" in c else "")


def _fact(relation: str, c: dict, deceased: bool) -> str:
    """'grandfather (deceased): stroke at 68'. Deceased only when FHIR says so; living or unknown carry no marker."""
    return f"{relation}{' (deceased)' if deceased else ''}: {_fmt(c)}"


def _reason(facts: list[tuple[str, dict, bool]], kinds: set[str]) -> str | None:
    """'mother: hypertension at 61; grandfather: stroke at 68', limited to the conditions behind this screening."""
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
    relatives = _relatives(resources, person_id)
    parents = [p for p in relatives if p["relation"] in PARENTS]
    spouse = next((p for p in relatives if p["relation"] in SPOUSES), None)
    father = next((p for p in parents if p["relation"] == "father"), None)
    children = [p for p in relatives if p["relation"] in CHILDREN]
    # Grandchildren hang under the first son, else the first child.
    middle = next((p for p in children if p["relation"] == "son"), children[0] if children else None)

    me = {"id": person_id, "name": person["displayName"], "relation": "self", "generation": 1,
          "conditions": [_public(c) for c in self_conditions]}
    if (age := _patient_age(patient)) is not None:
        me["age"] = age
    if place := next((a["district"] for a in patient.get("address") or [] if a.get("district")), None):
        me["place"] = place
    if father:
        me["parentId"] = father["id"]

    members = []
    for p in relatives:
        m = _member(p)
        if p["relation"] in SIBLINGS and father:
            m["parentId"] = father["id"]
        elif p["relation"] in CHILDREN:
            m["parentId"] = person_id
        elif p["relation"] in GRANDCHILDREN and middle:
            m["parentId"] = middle["id"]
        members.append(m)
    members.insert(len(parents), me)

    # Blood relatives of the seed circle that have no FHIR record; neighbours and other non-family roles are left out.
    known = {m["id"] for m in members}
    for entry in person.get("circle") or []:
        rel = entry.get("relation")
        if entry["memberId"] not in known and (rel in SIBLINGS or rel in CHILDREN):
            m = {"id": entry["memberId"], "name": people[entry["memberId"]]["displayName"], "relation": rel,
                 "generation": 1 if rel in SIBLINGS else 2, "conditions": []}
            if rel in CHILDREN:
                m["parentId"] = person_id
            elif father:
                m["parentId"] = father["id"]
            members.append(m)

    flags, facts = [], {}
    for m in members:
        if m["relation"] in CHILDREN:
            # The person herself is the living subject of the record, so she is never marked deceased.
            history = [(self_role, c, False) for c in self_conditions]
            if spouse:
                history += [(SPOUSES[spouse["relation"]], c, spouse["deceased"]) for c in spouse["conditions"]]
            history += [("grand" + p["relation"], c, p["deceased"]) for p in parents for c in p["conditions"]]
        elif m["relation"] in SIBLINGS:
            history = [(p["relation"], c, p["deceased"]) for p in parents for c in p["conditions"]]
        else:
            continue
        for screening, kinds in SCREENINGS:
            if reason := _reason(history, kinds):
                flags.append({"memberId": m["id"], "screening": screening, "reason": reason})
                facts[(m["id"], screening)] = [_fact(rel, c, dead) for rel, c, dead in history if c["kind"] in kinds]

    sources = sorted({f"Patient/{person_id}"} | {p["ref"] for p in relatives} | {c["ref"] for c in self_conditions})
    return {"doc": {"members": members, "flags": flags}, "facts": facts, "sources": sources}
