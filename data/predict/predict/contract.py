"""Shape checks for the Firestore documents, mirroring web/src/data/contract.ts (FamilyDoc). Returns a list of problems."""

MEMBER_REQUIRED = {"id": str, "name": str, "relation": str, "generation": int, "conditions": list}
MEMBER_OPTIONAL = {"deceased": bool, "parentId": str}
FLAG_REQUIRED = {"memberId": str, "screening": str, "reason": str}
FLAG_OPTIONAL = {"explanation": str}


def _fields(obj: dict, required: dict, optional: dict, where: str) -> list[str]:
    problems = []
    if not isinstance(obj, dict):
        return [f"{where}: not an object"]
    for key, typ in required.items():
        if key not in obj:
            problems.append(f"{where}.{key}: missing")
        elif not isinstance(obj[key], typ) or (typ is int and isinstance(obj[key], bool)):
            problems.append(f"{where}.{key}: expected {typ.__name__}")
    for key, value in obj.items():
        if key in required:
            continue
        if key not in optional:
            problems.append(f"{where}.{key}: not in the contract")
        elif value is None or not isinstance(value, optional[key]):
            problems.append(f"{where}.{key}: expected {optional[key].__name__} (absent fields are omitted, never null)")
    return problems


def check_family_doc(doc: dict) -> list[str]:
    if set(doc) != {"members", "flags"}:
        return [f"families doc keys must be members and flags, got {sorted(doc)}"]
    problems, ids = [], set()
    for i, m in enumerate(doc["members"]):
        problems += _fields(m, MEMBER_REQUIRED, MEMBER_OPTIONAL, f"members[{i}]")
        ids.add(m.get("id"))
        for j, c in enumerate(m.get("conditions") or []):
            problems += _fields(c, {"label": str}, {"ageAtOnset": int}, f"members[{i}].conditions[{j}]")
    if len(ids) != len(doc["members"]):
        problems.append("member ids must be unique")
    if sum(m.get("relation") == "self" for m in doc["members"]) != 1:
        problems.append("exactly one member must have relation self")
    for i, m in enumerate(doc["members"]):
        if "parentId" in m and m["parentId"] not in ids:
            problems.append(f"members[{i}].parentId: unknown member")
    for i, f in enumerate(doc["flags"]):
        problems += _fields(f, FLAG_REQUIRED, FLAG_OPTIONAL, f"flags[{i}]")
        if f.get("memberId") not in ids:
            problems.append(f"flags[{i}].memberId: unknown member")
    return problems


LEVELS = {"LOW", "MEDIUM", "HIGH"}
POINT_FIELDS = {"date": str, "systolic": (int, float), "systolicForecast": (int, float), "lower": (int, float),
                "upper": (int, float)}


def check_forecast_doc(doc: dict) -> list[str]:
    """Mirrors web/src/data/contract.ts ForecastDoc, SeriesPoint and RiskLevel."""
    allowed = {"asOf", "storyDay", "method", "risks", "drivers", "action", "series"}
    if not isinstance(doc, dict) or not {"asOf", "storyDay", "method", "risks", "drivers", "series"} <= set(doc) \
            or set(doc) - allowed:
        return [f"forecast doc keys must be {sorted(allowed)} (action optional)"]
    problems = []
    if not isinstance(doc["asOf"], str) or not doc["asOf"].endswith("Z"):
        problems.append("asOf: ISO UTC string ending in Z")
    if not isinstance(doc["storyDay"], int) or isinstance(doc["storyDay"], bool):
        problems.append("storyDay: expected int")
    if not isinstance(doc["method"], str):
        problems.append("method: expected str")
    for i, r in enumerate(doc["risks"] if isinstance(doc["risks"], list) else [None]):
        problems += _fields(r, {"condition": str, "horizonDays": int, "level": str}, {}, f"risks[{i}]")
        if isinstance(r, dict) and r.get("level") not in LEVELS:
            problems.append(f"risks[{i}].level: one of {sorted(LEVELS)}")
    if not isinstance(doc["drivers"], list) or not all(isinstance(d, str) for d in doc["drivers"]):
        problems.append("drivers: expected list of str")
    if "action" in doc:
        problems += _fields(doc["action"], {"text": str}, {"ownerMemberId": str}, "action")
    for i, p in enumerate(doc["series"] if isinstance(doc["series"], list) else [None]):
        if not isinstance(p, dict) or "date" not in p or set(p) - set(POINT_FIELDS):
            problems.append(f"series[{i}]: date plus systolic or systolicForecast/lower/upper only")
            continue
        for k, v in p.items():
            if v is None or not isinstance(v, POINT_FIELDS[k]) or isinstance(v, bool):
                problems.append(f"series[{i}].{k}: wrong type (absent fields are omitted, never null)")
    return problems
