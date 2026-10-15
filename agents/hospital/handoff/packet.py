"""Builds the contract 4.4 packet and its text from request facts and the consent-filtered record.

Request facts (suspected, last known well, findings, ETA, family contact) come from the emergency
itself and are always included. Everything from the FHIR record goes through the ConsentDecision.
The text keeps the prototype's row order: Patient, Status, Last well, Findings, History, Medicines,
Allergy, Function, Comms, Contact. Labels are Vietnamese with the contract's English term in brackets.
"""
from datetime import datetime, timedelta, timezone

from .consent import ConsentDecision
from .contracts import Category, Contact, HandoffPacket, HandoffRequest, Patient, Status
from .record import Record

HUE = timezone(timedelta(hours=7))  # Vietnam has no daylight saving time
# Contract 4.4: "baseline is a constant in the agent prompt; FHIR has no source for it".
BASELINE = {"ba-mai": "Lives alone, independent"}
WARNING_CATEGORY: dict[str, Category] = {
    "CONDITION_UNREADABLE": "conditions",
    "MEDICATION_UNREADABLE": "medications",
    "ALLERGY_UNREADABLE": "allergies",
    "ALLERGY_RECORD_CONFLICT": "allergies",
    "ALLERGIES_NOT_RECORDED": "allergies",
}
COMMS_TEXT = {"HARD_OF_HEARING": "hard of hearing", "COGNITIVE_IMPAIRMENT": "cognitive impairment"}
WITHHELD = "không chia sẻ (withheld: no consent)"
NONE_RECORDED = "chưa ghi nhận (none recorded)"


def _local(ts: str) -> str:
    return datetime.fromisoformat(ts).astimezone(HUE).strftime("%H:%M %d/%m (UTC+7)")


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
    baseline = BASELINE.get(req.person_id) if ok("identity") else None

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
    packet.text = render_text(packet, record_read=record is not None)
    return packet


def render_text(p: HandoffPacket, *, record_read: bool) -> str:
    def row(category: Category, value: str | None) -> str:
        if category in p.withheld:
            return WITHHELD
        if not record_read:
            if "PATIENT_NOT_FOUND" in p.warnings:
                return "không có hồ sơ (record not found)"
            return "không đọc được hồ sơ (record unavailable)"
        return value or NONE_RECORDED

    eta = f"ETA {p.eta_min} min" if p.eta_min is not None else "ETA unknown"
    if p.patient:
        who = ", ".join(str(x) for x in (p.patient.name, p.patient.age, p.patient.sex) if x is not None)
    else:
        who = "Bệnh nhân (patient): " + row("identity", None)
    status = ("nghi đột quỵ (suspected stroke)" if p.suspected == "STROKE"
              else "cấp cứu, chưa rõ nguyên nhân (emergency, cause unknown)")
    last_well = _local(p.last_known_well_at) if p.last_known_well_at else "không rõ (unknown)"
    findings = " · ".join(p.findings) if p.findings else "không có (none reported)"
    history = row("conditions", ", ".join(p.conditions or []))
    if record_read and (p.family_history or "familyHistory" in p.withheld):
        history += " · gia đình (family): " + row("familyHistory", "; ".join(p.family_history or []))
    meds = ", ".join(f"{m.name} {m.dose}" if m.dose else m.name for m in p.medications or [])
    if p.allergies is None:
        allergy = "chưa ghi nhận, cần hỏi (not recorded, ask)"
    else:
        allergy = ", ".join(p.allergies) or "không dị ứng đã biết (no known allergy, recorded)"
    comms = ", ".join(COMMS_TEXT[c] for c in p.communication or [])
    contact = f"{p.contact.name} ({p.contact.relation})" if p.contact else "không có (none)"
    return "\n".join([
        f"PRE-ARRIVAL · {eta}",
        who,
        f"Tình trạng (Status): {status}",
        f"Bình thường lần cuối (Last well): {last_well}",
        f"Dấu hiệu (Findings): {findings}",
        f"Bệnh sử (History): {history}",
        f"Thuốc (Medicines): {row('medications', meds)}",
        f"Dị ứng (Allergy): {row('allergies', allergy)}",
        f"Chức năng (Function): {row('identity', p.baseline)}",
        f"Giao tiếp (Comms): {row('communication', comms)}",
        f"Người nhà (Contact): {contact}",
        "DỮ LIỆU MÔ PHỎNG · SYNTHETIC DEMO DATA",
    ])
