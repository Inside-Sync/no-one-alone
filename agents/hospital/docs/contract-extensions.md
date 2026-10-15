# Proposed changes to docs/contract.md (for Dũng's review)

Status: draft from Minh, 15/10. Nothing here is in the shared contract yet. hospital-agent already follows
v1.3 for the request and every field in the 4.4 example; the items below are additive and optional.

## 1. Additive fields in the 4.4 packet

| Field | Type | Meaning |
|---|---|---|
| `status` | `COMPLETED` \| `PARTIAL` \| `BLOCKED_CONSENT` | How the packet was prepared. This is not delivery status: it never means the hospital received anything |
| `familyHistory` | string[] | From FamilyMemberHistory, e.g. `"father: stroke at 68, hypertension"`. 4.4 already lists that resource but has no field for it |
| `withheld` | category[] | Record categories left out because consent does not permit them |
| `warnings` | string[] | Codes only: `RECORD_UNAVAILABLE`, `PATIENT_NOT_FOUND`, `ALLERGIES_NOT_RECORDED`, `ETA_UNKNOWN`, `LAST_KNOWN_WELL_UNKNOWN`, `CONDITION_UNREADABLE`, `MEDICATION_UNREADABLE`, `ALLERGY_UNREADABLE`, `ALLERGY_RECORD_CONFLICT` |
| `sources` | string[] | FHIR references the packet was built from, including the Consent that authorized it |

Categories: `identity`, `conditions`, `medications`, `allergies`, `familyHistory`, `communication`.

core-api stores `packet` as a map, so these reach Firestore unchanged. respond-agent should pass the packet
through without dropping fields.

## 2. Field presence rules

The 4.4 example shows every field. hospital-agent omits a field (contract section 1) when:

- its category is not permitted by consent (`patient`, `baseline` need `identity`);
- the record could not be read (`status: PARTIAL`);
- `allergies`: no AllergyIntolerance is recorded. Absent means unknown, never "no allergies". A recorded
  "no known allergy" gives `[]`;
- `etaMin`, `lastKnownWellAt`: absent in the request.

`suspected`, `findings`, `text`, `status` are always present. Non-confirmed conditions carry a
`(provisional)` suffix. Conditions are sorted alphabetically so the output does not depend on store order.

## 3. Consent policy (needs team approval)

- A FHIR `Consent` on the person authorizes sharing with the receiving emergency department: status
  `active`, scope `patient-privacy`, `provision.type = permit`, purpose `ETREAT`, actor role `IRCP`, period
  covering now. Its `provision.code` values on `https://noonealone.insidesync.ai/fhir/CodeSystem/hospital-sharing`
  are the permitted categories; nested `deny` provisions remove categories.
- No valid Consent: `status: BLOCKED_CONSENT`. Nothing from the FHIR record is shared: no name, age, sex,
  conditions, medications, allergies, family history, communication needs or baseline.
- Facts that core-api puts in the request (suspected, last known well, findings, ETA, family contact) come
  from the emergency itself and are always included.
- There is no emergency override. Adding one is a policy decision for the team, not an agent default.
- Bà Mai's synthetic Consent permits all six categories, so the demo shows the full packet.

## 4. Text packet

First two lines as in the 4.4 example (`PRE-ARRIVAL · ETA 14 min`, `Bà Mai, 78, F`), then rows in the
prototype's order with Vietnamese labels and the English term in brackets, ending with
`DỮ LIỆU MÔ PHỎNG · SYNTHETIC DEMO DATA`. Times are shown in UTC+7.

## 5. Transport details for 4.4

- The reply is a completed A2A task whose artifact holds one text part with the packet JSON.
  A data part or JSON text part are both accepted as input.
- Errors use the contract error shape inside that text: `INVALID_REQUEST` (bad body) or `AGENT_FAILED`.
  Over HTTP these are 400 and 502.
- HTTP fallback: `POST /handoff` on hospital-agent, same body and reply.
- Both agents pin `google-adk[a2a]==2.11.0` and `a2a-sdk==1.2.2`. a2a-sdk 1.x and 0.3.x are not wire compatible.
- hospital-agent needs env `A2A_PUBLIC_URL` = its own Cloud Run URL; the agent card advertises it and A2A
  clients send messages there.

## 6. Points to fix elsewhere (not hospital-agent code)

- core-api writes `handoff.status: RECEIVED` and the timeline says "<hospital> received the packet" when
  the agent call succeeds. Nothing confirms hospital receipt; suggest `PREPARED` or wording "packet prepared for".
- core-api sends the first NEARBY member as `onScene` before anyone has accepted; the packet then says
  `contact.onScene: true`. Suggest sending the owner once accepted, or renaming the field.
