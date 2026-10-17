# Synthetic FHIR R4 record for Bà Mai

`ba-mai.json` is a hand-written transaction Bundle for the Cloud Healthcare FHIR store `noa/records`
(contract section 5). Every person and record in it is fictional; every resource carries the
`HTEST` (test health data) security tag.

Content comes from docs/contract.md: 4.4 (conditions, medications, allergy, communication) and 2.5
(father: stroke at 68, hypertension). Patient id equals the personId `ba-mai` (contract section 1).

- No `birthDate`: no approved synthetic value yet. Age 78 (contract 2.1) is carried in the extension
  `https://noonealone.insidesync.ai/fhir/StructureDefinition/synthetic-stated-age`.
- `Consent/ba-mai-hospital-sharing` is a synthetic consent that permits all six hospital-sharing
  categories. See docs/contract.md section 4.4 for the policy.
- Every entry is a `PUT` with a fixed id. `scripts/load_fhir.py` loads the bundles into the store and
  skips resources that are already there with the same content, so loading twice changes nothing.

hospital-agent reads these files directly in fixture mode (`FHIR_SOURCE=fixture`), one file per `personId`. They sit inside `agents/hospital` so the Cloud Run image contains them.
