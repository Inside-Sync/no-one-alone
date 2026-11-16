# Synthetic FHIR R4 record for Moza Al Hammadi

`margaret.json` is a hand-written transaction Bundle for the Cloud Healthcare FHIR store `noa/records`
(contract section 5). Every person and record in it is fictional; every resource carries the
`HTEST` (test health data) security tag.

Content: conditions, medications, allergy and communication needs, plus family history
(father: stroke at 74, type 2 diabetes; mother: dementia). Patient id equals the personId `margaret` (contract section 1);
the id stays even though the patient is now Moza Al Hammadi, because the web and Firestore key on it.

- No `birthDate`: no approved synthetic value yet. Age 78 (contract 2.1) is carried in the extension
  `https://noonealone.insidesync.ai/fhir/StructureDefinition/synthetic-stated-age`.
- `Consent/margaret-hospital-sharing` is a synthetic consent that permits all six hospital-sharing
  categories. The policy is in `handoff/consent.py`.
- Every entry is a `PUT` with a fixed id. `scripts/load_fhir.py` loads the bundles into the store and
  skips resources that are already there with the same content, so loading twice changes nothing.
- The bundle has no Practitioner, Organization or telecom resources, so there is no phone, GP or hospital in it to change.

hospital-agent reads these files directly in fixture mode (`FHIR_SOURCE=fixture`), one file per `personId`. They sit inside `agents/hospital` so the Cloud Run image contains them.
