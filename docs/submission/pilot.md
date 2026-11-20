# Path to pilot

Everything on this page is a **proposal for discussion** with the family health centres and the Department of Health. Nothing here is agreed, and no pilot has started.

## 1. Proposed cohort

About **300 Emirati families with an adult aged 40 to 75 who is overdue or never screened** for IFHAS, plus their children due well-child visits, at **2 family health centres (Abu Dhabi city and Al Ain) and 1 partner hospital**, all connected through Malaffi. They are compared with **usual reminders**.

Why this group:

- Saeed, the demo lead, is a close fit: 64, type 2 diabetes, with his eye and kidney checks 14 months overdue.
- Overdue and never-screened families should already be visible in the programme's records, so they can be found without new tests.
- Three sites are small enough for clinicians to review every flagged result.
- The demo IFHAS rule already covers Emirati adults aged 18 to 75, so no new eligibility rule is needed.

## 2. Timeline

| When | What |
|---|---|
| Months 0 to 3 | Setup: sandbox access, consent flow, clinician sign-off of rules and scripts, Arabic and English review. |
| Months 3 to 4 | Pilot at the 2 centres and 1 hospital, compared with usual reminders; speech check study in parallel. |
| Month 5 | Evaluate uptake, accuracy and equity by group; start local risk calibration. |
| Months 6 to 12 | Scale and adoption if the evaluation supports it: more family health centres in Abu Dhabi, more programmes, the government view for programme teams, ready for other emirates through Riayati and NABIDH. |

Measures that need longer follow-up (missed cases within 12 months, calibration) keep being tracked after the month-5 evaluation.

## 3. Success measures (proposed targets, to agree with the clinics)

| Measure | Proposed target |
|---|---|
| Well-child visits on time | +15 percentage points |
| IFHAS completed | +10 percentage points |
| Never-screened people reached | 30% |
| Reminders per completed check | -50% |
| Barrier matched to the right help | 80% |
| Flagged results reach care within 2 weeks | 90% |
| High forecast risk seen by a clinician within 2 weeks | 85% |
| Equity gap between groups | under 5 points |
| Person's choice respected | 100% |
| Safety net: alert to call | under 3 minutes |

Related: "clinical decisions taken without a clinician: none". The Test case computes demo versions of some of these from the case you run (screened, days to booking, barriers removed, minutes to the 998 call, teach-back right first time, results reaching care). They use fictional data and are not evidence.

To reduce clinic load: lower-risk questions can be answered remotely first, and only a forecast risk of 20% or more, or an abnormal result, needs a clinic visit. One family trip can replace three separate visits.

## 4. What deployment needs

| Need | Status |
|---|---|
| Department of Health sandbox access | Not started. |
| Malaffi onboarding (read the shared record with the person's consent) | Not built. |
| ADHICS compliance review | Not started. |
| UAE hosting under Department of Health rules | Not built. The demo is in Singapore. |
| IFHAS data feed, to know who is due | Not built. |
| Clinical sign-off of every rule and script | Not done. Thresholds are demo thresholds. |
| Native Arabic and English review of every message | Not done. Arabic is machine-written. |
| UAE calibration of the heart-risk score | Not done. |
| A production audit log | Not built. |

## 5. Commercial path

Proposed model: a per-family yearly licence paid by providers or payers, linked to checks completed and items seen on time. Noa runs on the live InsideSync platform, so running costs stay low. We have not yet priced a contract, so we make no revenue claim. The route is a funded pilot with the Department of Health (design partner and data access targeted by month 3), then a service for family health centres. What we could show in the pilot is the extra checks completed and the fewer reminders sent for each check.
