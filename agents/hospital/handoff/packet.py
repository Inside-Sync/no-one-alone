"""Builds the contract 4.4 packet and its text from request facts and the consent-filtered record.

Request facts (suspected, last known well, findings, ETA, family contact) come from the emergency
itself and are always included. Everything from the FHIR record goes through the ConsentDecision.
The text keeps the prototype's row order: Patient, Status, Last well, Findings, History, Medicines,
Allergy, Function, Comms, Contact. Labels, zone and baseline come from the person's profile.
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from .consent import ConsentDecision
from .contracts import Category, Contact, HandoffPacket, HandoffRequest, Patient, Status
from .record import Record

WARNING_CATEGORY: dict[str, Category] = {
    "CONDITION_UNREADABLE": "conditions",
    "MEDICATION_UNREADABLE": "medications",
    "ALLERGY_UNREADABLE": "allergies",
    "ALLERGY_RECORD_CONFLICT": "allergies",
    "ALLERGIES_NOT_RECORDED": "allergies",
}
COMMS_TEXT = {"HARD_OF_HEARING": "hard of hearing", "COGNITIVE_IMPAIRMENT": "cognitive impairment"}

VI = {
    "withheld": "không chia sẻ (withheld: no consent)",
    "none_recorded": "chưa ghi nhận (none recorded)",
    "unavailable": "không đọc được hồ sơ (record unavailable)",
    "not_found": "không có hồ sơ (record not found)",
    "patient": "Bệnh nhân (patient): ",
    "stroke": "nghi đột quỵ (suspected stroke)",
    "emergency": "cấp cứu, chưa rõ nguyên nhân (emergency, cause unknown)",
    "unknown": "không rõ (unknown)",
    "no_findings": "không có (none reported)",
    "family": " · gia đình (family): ",
    "allergy_unknown": "chưa ghi nhận, cần hỏi (not recorded, ask)",
    "no_allergy": "không dị ứng đã biết (no known allergy, recorded)",
    "no_contact": "không có (none)",
    "status": "Tình trạng (Status)", "last_well": "Bình thường lần cuối (Last well)",
    "findings": "Dấu hiệu (Findings)", "history": "Bệnh sử (History)", "meds": "Thuốc (Medicines)",
    "allergy": "Dị ứng (Allergy)", "function": "Chức năng (Function)", "comms": "Giao tiếp (Comms)",
    "contact": "Người nhà (Contact)", "footer": "DỮ LIỆU MÔ PHỎNG · SYNTHETIC DEMO DATA",
}
EN = {
    "withheld": "withheld: no consent",
    "none_recorded": "none recorded",
    "unavailable": "record unavailable",
    "not_found": "record not found",
    "patient": "Patient: ",
    "stroke": "suspected stroke",
    "emergency": "emergency, cause unknown",
    "unknown": "unknown",
    "no_findings": "none reported",
    "family": " · family: ",
    "allergy_unknown": "not recorded, ask",
    "no_allergy": "no known allergy (recorded)",
    "no_contact": "none",
    "status": "Status", "last_well": "Last well", "findings": "Findings", "history": "History",
    "meds": "Medicines", "allergy": "Allergy", "function": "Function", "comms": "Comms",
    "contact": "Contact", "footer": "SYNTHETIC DEMO DATA",
}


@dataclass(frozen=True)
class Profile:
    zone: ZoneInfo
    zone_label: str | None  # None: use the zone's abbreviation (AEDT/AEST)
    labels: dict[str, str]
    baseline: str  # Contract 4.4: a constant in the agent prompt, FHIR has no source for it


PROFILES = {
    "ba-mai": Profile(ZoneInfo("Asia/Ho_Chi_Minh"), "UTC+7", VI, "Lives alone, independent"),
    "margaret": Profile(ZoneInfo("Australia/Sydney"), None, EN, "Lives alone, independent, walking stick outdoors"),
}


def profile(person_id: str) -> Profile:
    return PROFILES.get(person_id, PROFILES["ba-mai"])


def _local(ts: str, pr: Profile) -> str:
    t = datetime.fromisoformat(ts).astimezone(pr.zone)
    return t.strftime("%H:%M %d/%m") + f" ({pr.zone_label or t.tzname()})"


def build(req: HandoffRequest, record: Record | None, decision: ConsentDecision | None,
          status: Status, warnings: list[str]) -> HandoffPacket:
    """record and decision are None when the record could not be read."""
    allowed = decision.allowed if decision else frozenset()
    ok = lambda c: record is not None and c in allowed  # noqa: E731
    sources: list[str] = list(decision.refs) if decision else []

    def use(items: list[tuple]) -> list:
        sources.extend(r for _, r in items)
        return [v for v, _ in items]

    patient = None
    if ok("identity") and record.patient_ref:
        patient = Patient(name=record.name, age=record.age, sex=record.sex)
        sources.append(record.patient_ref)
    conditions = use(record.conditions) if ok("conditions") else None
    medications = use(record.medications) if ok("medications") else None
    allergies = use(record.allergies) if ok("allergies") and record.allergies is not None else None
    communication = use(record.communication) if ok("communication") else None
    family = use(record.family_history) if ok("familyHistory") else None
    baseline = profile(req.person_id).baseline if ok("identity") else None

    warnings = list(warnings)
    if record is not None:
        warnings += [w for w in record.warnings if ok(WARNING_CATEGORY.get(w, "identity"))]
        if ok("allergies") and record.allergies is None:
            warnings.append("ALLERGIES_NOT_RECORDED")
    if req.hospital.eta_min is None:
        warnings.append("ETA_UNKNOWN")
    if req.last_known_well_at is None:
        warnings.append("LAST_KNOWN_WELL_UNKNOWN")

    packet = HandoffPacket(
        patient=patient,
        suspected=req.suspected,
        last_known_well_at=req.last_known_well_at,
        findings=list(req.findings),
        conditions=conditions,
        medications=medications,
        allergies=allergies,
        communication=sorted(set(communication)) if communication is not None else None,
        baseline=baseline,
        contact=Contact(name=req.on_scene.name, relation=req.on_scene.relation, on_scene=True) if req.on_scene else None,
        eta_min=req.hospital.eta_min,
        text="",
        status=status,
        family_history=family,
        withheld=decision.withheld() if decision and record is not None else [],
        warnings=sorted(set(warnings)),
        sources=sorted(set(sources)),
    )
    packet.text = render_text(packet, record_read=record is not None, pr=profile(req.person_id))
    return packet


def render_text(p: HandoffPacket, *, record_read: bool, pr: Profile) -> str:
    L = pr.labels

    def row(category: Category, value: str | None) -> str:
        if category in p.withheld:
            return L["withheld"]
        if not record_read:
            return L["not_found"] if "PATIENT_NOT_FOUND" in p.warnings else L["unavailable"]
        return value or L["none_recorded"]

    eta = f"ETA {p.eta_min} min" if p.eta_min is not None else "ETA unknown"
    if p.patient:
        who = ", ".join(str(x) for x in (p.patient.name, p.patient.age, p.patient.sex) if x is not None)
    else:
        who = L["patient"] + row("identity", None)
    status = L["stroke"] if p.suspected == "STROKE" else L["emergency"]
    last_well = _local(p.last_known_well_at, pr) if p.last_known_well_at else L["unknown"]
    findings = " · ".join(p.findings) if p.findings else L["no_findings"]
    history = row("conditions", ", ".join(p.conditions or []))
    if record_read and (p.family_history or "familyHistory" in p.withheld):
        history += L["family"] + row("familyHistory", "; ".join(p.family_history or []))
    meds = ", ".join(f"{m.name} {m.dose}" if m.dose else m.name for m in p.medications or [])
    if p.allergies is None:
        allergy = L["allergy_unknown"]
    else:
        allergy = ", ".join(p.allergies) or L["no_allergy"]
    comms = ", ".join(COMMS_TEXT[c] for c in p.communication or [])
    contact = f"{p.contact.name} ({p.contact.relation})" if p.contact else L["no_contact"]
    return "\n".join([
        f"PRE-ARRIVAL · {eta}",
        who,
        f"{L['status']}: {status}",
        f"{L['last_well']}: {last_well}",
        f"{L['findings']}: {findings}",
        f"{L['history']}: {history}",
        f"{L['meds']}: {row('medications', meds)}",
        f"{L['allergy']}: {row('allergies', allergy)}",
        f"{L['function']}: {row('identity', p.baseline)}",
        f"{L['comms']}: {row('communication', comms)}",
        f"{L['contact']}: {contact}",
        L["footer"],
    ])
