# No One Alone: test cases, benchmark and results

_Abu Dhabi family-health app. Noa is the in-app assistant, built as several agents (Guardian, Forecast, Voice, Insight, Navigator, Courier and others) with a rules engine that decides. All people and readings are synthetic (section 5). Thresholds are demo values without clinical sign-off. Figures dated 20 Nov 2026._

## 1. Headline

| What | Result |
|---|---|
| Quick test cases, full journey, English and Arabic | **10 of 10 pass** in all 40 runs (with and without AI) |
| Emergency handler ("998 now"), 132 safety scenarios (night safety net of the earlier rules-engine prototype) | **0 missed emergencies, 0 false alarms**: sensitivity 49/49, specificity 83/83 |
| Rule benchmark of the same earlier rules engine, 252 scenarios (191 easy, 61 hard) | **252 of 252 match** the published rule table |
| Rules only vs. rules plus a real AI model | **20 of 20 pairs give the same outcome**; the AI changed wording only |
| Automated tests | **2,052 unit and integration tests: 2,051 pass, 1 skipped**; family-health browser tests **18 of 18**; AI server checks **203 of 203** |

## 2. Benchmark of the most important agent: the emergency handler

The emergency decision is made by the rules engine, never by the AI. Source: [test-report.md](test-report.md) (night safety-net rules of the earlier rules-engine prototype, the "Test case": kept in the code and used by the benchmark, `npm run benchmark:report`, not shown in the live app; real engine, one fresh run per scenario, 95% Wilson intervals). The live family-health journey's emergency branch is covered by quick case s2 below and by the automated tests (section 4).

| | Noa: 998 now | Noa: not 998 |
|---|---|---|
| **Rule table: 998 now** | 49 | 0 missed |
| **Rule table: not 998** | 0 false alarms | 83 |

| Measure | Value |
|---|---|
| Sensitivity | 100% (49 of 49; 95% CI 92.7% to 100%) |
| Specificity | 100% (83 of 83; 95% CI 95.6% to 100%) |
| Arabic subgroup | sensitivity 7 of 7, specificity 9 of 9 (wide intervals: 64.6% to 100% and 70.1% to 100%) |
| Hard subgroup | sensitivity 14 of 14, specificity 12 of 12 |

**Two approaches compared** on the 10 quick test cases, English and Arabic (live run, 20 Nov 2026):

| Measure | Rules + prepared text | Rules + real AI model |
|---|---|---|
| Runs | 20 | 20 |
| Final outcome identical to the other approach | 20 of 20 | 20 of 20 |
| Emergency case (s2) sent to "see a doctor now" | 2 of 2 | 2 of 2 |
| Emergency advice from the fixed, pre-written script | 2 of 2 | 2 of 2 |
| Messages written by the AI model | 0 | 96 (EN 42, AR 54) |
| AI text rejected by server checks, prepared text shown | n/a | 15 (EN 14, AR 1), all for length |
| AI call failed, prepared text shown | n/a | 6 (EN 3, AR 3) |
| Page errors | 0 | 0 |

A separate automated test runs all 10 cases in both languages with a deliberately hostile fake AI (dose advice, "you do not need to call 998", wrong next step, least urgent reading of every reply): 20 of 20 outcomes identical, unsafe text never shown.

## 3. Test cases: input, expected, actual, error source

**Error source** names the agent responsible for a deviation. In the quick cases no outcome deviated. Where the AI's wording was rejected or failed, the prepared text was shown and the outcome still passed; that agent is named as a wording deviation. Actual answers come from the live-AI run on 20 Nov 2026 and are identical with and without AI.

### 3a. The 10 quick test cases (product journey)

| Case | Level | Input | Expected answer | Actual answer (all 4 runs) | Error source | Pass |
|---|---|---|---|---|---|---|
| s0 | Hard | Saeed, 64, diabetes; watch 128 bpm at rest for 22 min; first speech try unclear, repeat normal | Noa prompts a check by itself (G1); repeat speech check (Q1); doctor review today first, then eye, kidney, bowel and flu checks | Referred: 5 checks booked, 2 items for the doctor, recall set | Outcome: none. Wording: Forecast and Navigator (EN, too long); Navigator (AR, call failed) | Yes |
| s2 | Easy | Same racing heart; speech clearly slurred | Red, immediate: screening paused, see a doctor now at the emergency department, nothing booked (Q1, V1) | Emergency: screening paused, see a doctor immediately; nothing booked; fixed script used | Outcome: none. Wording: Forecast (EN, too long) | Yes |
| s3 | Easy | Glucose 2.7 mmol/L at 03:10 while asleep | Fast sugar, recheck in 15 min (L1); medicine review within 24 h heads the pathway | Referred: 5 checks booked, 2 items for the doctor; medicine review within 24 h first | Outcome: none. Wording: Forecast (EN, too long); Navigator (AR, call failed) | Yes |
| k1 | Easy | Khalid, 38, smokes, never screened; inherited cholesterol variant | Cholesterol test first, quit support; variant and sleep study to the doctor | Referred: 4 checks booked, 2 items for the doctor | Outcome: none. Wording: Navigator and Courier (EN, too long); Navigator (AR, too long) | Yes |
| k3 | Hard | Chest tightness on exertion, then "not now" to booking | Doctor within 1 week heads the pathway (H2); routine paused (N3) but urgent item still sent to the doctor (U1) | Routine checks paused; urgent item escalated to the doctor (U1) | Outcome: none. Wording: Forecast and Insight (EN, too long); Navigator (EN, call failed) | Yes |
| k4 | Easy | Blood pressure 184/112 today | Flag by itself (B1): doctor today, first in pathway; no speech check | Referred: 4 checks booked, 3 items for the doctor; doctor review today first | Outcome: none. Wording: Forecast and Navigator (EN, call failed); Navigator (AR, call failed) | Yes |
| a1 | Easy | Amna, 35, diabetes in pregnancy; mother had breast cancer at 48 | HbA1c and cervical screening; breast risk assessment to the doctor (under programme age) | Referred: 2 checks booked, 1 item for the doctor | Outcome: none. Wording: Forecast and Navigator (EN, too long) | Yes |
| m1 | Easy | Moza, 78, 11 days after a stroke, hard of hearing; prefers a female doctor | No aged-out screening; bone scan, flu vaccine; hearing referral; falls, mood, stroke and BP items for the doctor | Referred: 3 checks booked, 5 items for the doctor | Outcome: none. Wording: Forecast and Navigator (EN, too long) | Yes |
| h1 | Easy | Hind, 18 months, visit 3 weeks overdue, says 1-2 words | 18-month visit and vaccines with M-CHAT-R; development review and hearing test for the paediatrician (K2) | Referred: 2 checks booked, 1 item for the doctor | Outcome: none. Wording: Forecast (EN, too long) | Yes |
| d1 | Easy | Hamdan, 5, starts school, squints | 5-year visit with school vision and hearing; possible eye referral for the paediatrician (K2) | Referred: 2 checks booked, 1 item for the doctor | Outcome: none. Wording: Forecast (EN, too long) | Yes |

Agent roles: Forecast and Navigator are the screening agent (explain the flags; offer the pathway); Insight and Courier are the specialist agent (sum up home results; write the referral).

### 3b. Hard cases (rule benchmark, real rows)

Missing, impossible, contradictory, misspelt and wrong-language input. Source: [test-report.md](test-report.md), section 7. On a mismatch the benchmark records the first agent that diverged (input check, Guardian sensor rule, Voice speech check, Noa decision); none diverged.

| Scenario | Level | Input | Expected answer | Actual answer | Error source | Pass |
|---|---|---|---|---|---|---|
| T-hr-empty | Hard: missing | Heart rate left empty | Input refused | Input refused | None | Yes |
| T-missing-glu-dm | Hard: missing | Glucose sensor missing for a person with diabetes, heart rate fine | R12 · No action | R12 · No action | None | Yes |
| T-hr-400 | Hard: impossible | Heart rate 400 bpm typed | Input refused | Input refused | None | Yes |
| T-spo2-150 | Hard: impossible | Oxygen 150% typed | Input refused | Input refused | None | Yes |
| T-fix-glu | Hard: impossible, then corrected | Glucose 0.2 refused, corrected to 2.7; confused answer | R6 · 998 now | R6 · 998 now | None | Yes |
| C-fall-fine-speech-cant | Hard: contradictory | Fall: normal speech, but "I can't get up" | R7 · 998 now | R7 · 998 now | None | Yes |
| C-spo2-fine | Hard: contradictory | Oxygen 88% but "I feel fine" (the number wins) | R8 · 998 now | R8 · 998 now | None | Yes |
| T-typed-typos | Hard: typos | Typed speech with typos, "I am fine" | R1 · Stand down | R1 · Stand down | None | Yes |
| A-typed-english | Hard: wrong language | Arabic mode, English sentence typed | R5 · 998 now | R5 · 998 now | None | Yes |

Across 3a and 3b the rows shown are 8 easy and 11 hard (s0 and k3 in 3a, all 9 in 3b); missing input is covered by 3b (T-hr-empty, T-missing-glu-dm). All 61 hard benchmark cases match (95% CI 94.1% to 100%). Four engine issues found by the benchmark or a rule-order review were fixed before these numbers (report section 7); nothing was changed to make a number look better.

## 4. Automated tests

| Suite | Tests | What it proves |
|---|---|---|
| Full unit and integration run | 2,052 (2,051 pass, 1 skipped) | Whole web app, 118 files |
| Family-health suites | 265 of 265 | Prototype parity on 19 recorded runs (114), engine branches (64), go card and what-if (11), AI call contract (22 + 9), live-AI parity with a hostile AI (21), emergency chat never reaches the AI (3), AI case context (6), panel UI (15) |
| respond-agent (Python) | 203 of 203 | Server checks on AI text (length, language, doses, diagnosis, advice against emergency care, numbers only from the facts) and the call contract |
| Family-health browser tests | 18 of 18 | Real browser: auto start, Khalid to referral, emergency night mode and reset, edit and re-run, 390 px phone, Arabic right-to-left, accessibility (axe, contrast) |

**How to reproduce.** From `web`: `npx vitest run` (unit and integration); `npm run benchmark:report` (re-runs the 252 benchmark scenarios and rewrites [test-report.md](test-report.md)). Cases tested: safety rules at, under and over each threshold; missing, impossible and refused values; contradictory answers; typos and wrong language; six times of day; nine people from child to older adult; English and Arabic; with and without AI.

## 5. Synthetic data

| What is synthetic | Why |
|---|---|
| All family members, records, device readings and answers | Privacy: no real patient appears anywhere |
| All 252 benchmark scenarios and their expected outcomes | No access to real patient data during the hackathon |
| Boundary, impossible and contradictory inputs | Edge cases can be created on demand, which real data rarely provides |

Synthetic data is acceptable for the hackathon: confirmed in the organisers' briefing.

## 6. Safety by design

| Principle | How |
|---|---|
| Rules decide, the AI only writes and reads words | Emergencies, rules, pathway, urgency, dates and scores come from the engine; AI text never triggers an action |
| Emergency advice is never AI | Fixed, pre-written script; emergency words in chat (English or Arabic) skip the AI |
| Two readers on risky answers | For danger signs, symptoms and a child's words, the AI and a keyword reader both read the reply; the more urgent wins |
| Server checks on every AI text | No doses, no diagnosis, no advice against emergency care, numbers only from the facts, right language, length limit |
| Fallback | Slow, failed or rejected AI text is replaced by the prepared text |

## 7. Limits and next steps

- **No clinical validation yet:** the benchmark proves rule conformance, not that the rules are right for real people; labels were written by the team; thresholds and the speech score are demo values.
- **Emergency benchmark** covers the night safety net of the earlier rules-engine prototype (Test case, not shown in the live app); the live journey's emergency branch is covered by quick case s2 and automated tests.
- **Arabic reviewed by machine only.** **Live AI run once** (40 runs); all 15 AI rejections were for length (Forecast 8, Navigator 5, Courier 1, Insight 1) and the word limit for Forecast and Navigator has since been raised to 80 words.
- **Next:** clinician sign-off, human Arabic review, then a proposed pilot of about 300 families at 2 family health centres and 1 hospital (proposal only: [pilot.md](pilot.md)).
