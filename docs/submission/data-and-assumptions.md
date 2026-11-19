# Data, assumptions and limitations

## 1. Data

**All data is fictional or synthetic.** No real patient, family, clinic or hospital is used. No real record was used to build or test anything.

| Data | Source |
|---|---|
| People (Moza, Khalid, Hind and the rest of the 8-person family, plus the other case characters) | Invented for the demo. |
| Medical records in the FHIR R4 store | Synthetic, written for the demo and loaded into a Cloud Healthcare API store. |
| Family history | Invented, kept in Firestore (`families/{personId}`, see [../data-contract.md](../data-contract.md)). |
| Sensor readings | Simulated by the Test case engine. Real devices are not read in the Test case. |
| Government view figures | Invented. |
| Benchmark scenarios (252) | Written by hand from the published rule table (`web/src/features/testcase/bench/scenarios.ts`). |
| Blood pressure for the offline forecast job | Synthetic (`data/predict/`). |

## 2. Assumptions

- **Well-child schedule:** 14 visits from 1 month to 6 years (1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60, 72 months). This is a small demo subset of a real schedule.
- **IFHAS:** the demo rule offers screening to **Emirati adults aged 18 to 75**. The demo uses a small subset of the 50 or more IFHAS tests.
- **Thresholds are demo thresholds** from the published rule table (for example R1: heart rate above 120 for 10 minutes while not moving; R3: glucose below 4.0 mmol/L; F1: 20% heart risk). They are not clinical guidance and have not been signed off by a clinician.
- **Framingham** is US-derived. It is used as a demo score for ages 30 to 74 without a prior heart attack or stroke.
- **Barriers:** the prevention logic assumes six barriers (does not know, access, trust or language, "I feel fine", forgot, later) and one enabler for each. Choosing "later" is respected for 3 months.
- **Emergency number:** 998, from the data contract (`people/{id}.emergencyNumber`, default 998).
- **Pilot figures** in [pilot.md](pilot.md) are proposals, not agreed plans.

## 3. Limitations

- **The rule benchmark is not clinical validation.** It checks that Noa follows its own rules on synthetic cases. The labels were written by the team, not an independent clinician, so an error in the rule table is copied into the labels. See section 9 of [test-report.md](test-report.md).
- **No testing with real patients or clinicians yet.**
- **Arabic is machine-written.** It needs review by a native speaker and a clinician before real use. Layout is mirrored for right-to-left.
- **Voice in Arabic has not been checked by ear.** The code marks the Arabic Chirp 3 HD locale (`ar-XA`) as unverified.
- **Speech check** is a demo score, not a validated stroke test. In the browser it needs Chrome or Edge for the microphone. Typing or a sample works everywhere.
- **Hosting:** the demo runs in `asia-southeast1` (Singapore), not in the UAE. The data is fictional.
- **Forecast** uses a model built on a US population and needs UAE calibration.
- **Not built:** Malaffi and HL7 link, a production audit log, UAE hosting, the IFHAS data feed. See [architecture.md](architecture.md).
- **The Test case does not call the backend.** It shows the logic, not the live integration.
- **Not load-tested.**
- **Small-cell suppression** covers the Government view cells it is applied to, not a full disclosure-control review.

## 4. Known differences, in test-report.md

The generated [test-report.md](test-report.md) lists every difference between the rule table and the engine. At the time of writing, all 252 scenarios match. Low sugar no longer hides another emergency sign: the 998 lines (R6, R7, R5, R8) are checked before the home lines (R9, R11, R10). The report also lists what the benchmark or a review found and we fixed. Re-run `npm run benchmark:report` for current numbers.
