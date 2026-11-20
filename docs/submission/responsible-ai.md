# Responsible AI, safety and data governance

Noa is **decision support, not diagnosis**. A person or a clinician decides every step that matters. All data is fictional.

## 1. Gates

The live "Noa · family health" journey (Detect → Protect → Home screening → Right pathway → Referral) stops where a person must decide (`web/src/features/familyHealth/engine/journey.ts`). Every step names the Orchestrator rule that fired.

| Gate | Rule |
|---|---|
| The person starts it | Noa stops after Detect. Nothing past Detect runs until the person (or the parent, for a child) presses the go card. |
| Consent | In Protect, the person chooses whether an optional result (a genomic result, where there is one) is used and which family member may see the pathway. On an urgent alert nothing new is asked: consent from enrolment covers the safety check and the family contact on file is told. |
| "Not now" | On a routine case "later" or "not now" is respected (N3). On an urgent alert, "not now" keeps it open and Noa asks again (U1). On a pathway with urgent items, the routine checks pause but the urgent items still go to the doctor (U1). |
| Emergency stop | When the rules decide "see a doctor now", the journey stops on the emergency branch and shows the fixed, pre-written emergency script. |
| Rule decision | The deciding rule code is shown (34 Orchestrator codes, such as D1, P1, U1, N3). |

The earlier "Test case" prototype (night safety net) had its own five gates (consent, enough data, urgent bypass, rule decision, human approval). It is kept in the code and used by the benchmark (`npm run benchmark:report`), but it is not shown in the live app.

## 2. Provenance labels

Every agent message in the live journey carries a label. It is always a word (colour only helps). Source: `web/src/features/familyHealth/engine/journey.ts` and the `agent.src` texts.

- **Live AI:** wording a model wrote for that one message, shown only after the server checks and the browser re-check passed.
- **Prepared:** wording written by the team; used when the live AI is off, fails or returns nothing better.
- **Fixed script:** the pre-written emergency advice. It never goes to the model.
- **Guardrail:** the model's text failed a check, so the prepared text is shown instead, with the reason.

Family notices and the Government weekly summary show the Live AI mark the same way when a model worded them.

## 3. Input guardrails

In the live journey, the record drawer's "Try different data" refuses a number outside its range (`EDIT_RANGES` in `web/src/features/familyHealth/data/people.ts`); the previous value stays.

In the earlier Test case prototype, every number a person can type has a plausible range (`web/src/features/testcase/engine/inputs.ts`). There are two levels.

- **Required:** the decision cannot be taken on it. A missing or implausible value (heart rate 400, oxygen 150%) is refused with an explanation. The previous valid value stays and the run waits.
- **Recommended:** a warning, and the flow continues. Example: cholesterol is not measured, so the BMI version of the score is used and the screen says so.

Family profile values are kept inside their range, with a warning.

What a Claude call receives (live AI needs `VITE_NOA_AI=on` and the Firebase data source; it is on in the live demo): the structured facts for that one call, with no free text except what the person typed (a reply or a question) and earlier turns of the same chat. The browser goes through core-api (`/api/noa/say`, `/api/noa/understand`, rate-limited) to respond-agent, which checks strict parameters and checks the text that comes back. For an agent message, that is the agent, the language, the reader and the facts the rules chose, which include a first name where the card shows one. For a typed reply to a card, it is the question, the options and the reply. For a question typed in the composer (`composer.reply`), it is the question, up to 6 earlier turns, the journey stage, the Detect flags, the bookings and what the person can do on screen now. For the family messages panel (`family.chat`), it is the question, recent notifications, each member's stage, bookings and emergency status, and up to 4 earlier turns. For a family notice (`family.notify`, routine notices only), it is the event and the person's relation. For the Government weekly summary (`analyst.weekly`), it is uptake aggregates only, for groups of 10 or more people. The call goes to the Claude API (api.anthropic.com, outside Google Cloud), reached with Workload Identity Federation (respond-agent's Cloud Run service account identity, no stored key) when the federation ids are set, or an API key when `ANTHROPIC_API_KEY` is set, or to Claude on Vertex AI otherwise.

## 4. Rules decide, not a model

Scores and routing use published, numbered rules. The rule table is shown after each decision. The speech check is a demo score (words matched and time taken). It is not a validated stroke test.

In the deployed backend, Gemini judges recorded speech and writes text. Rules set triage and the escalation plan. The hospital packet is built by rules with no LLM.

In the family journey, Claude writes wording only. The engine picks every agent, rule, test, pathway item, urgency and the emergency branch before the model is called. Typed replies to risky questions are read by Claude and by keywords, and the more urgent reading wins. Emergency advice never goes through the model.

## 5. Noa Forecast: limits

- Model: Framingham general cardiovascular risk, 10 years (D'Agostino et al., Circulation 2008).
- Valid only for ages **30 to 74** with **no prior heart attack or stroke**. Outside that, the screen says "not scored" and why.
- It is a **signal, not a diagnosis**, and the screen says so.
- Framingham was developed in a US population. It **needs UAE calibration** before any clinical use.
- Rules: F1, 20% or more, means a doctor looks within 2 weeks. F2, 10 to 20% with cholesterol not measured, means measure it at the next visit. These are demo thresholds.
- The 5-year "if the trend continues" and "if the plan is followed" lines are a what-if illustration.

## 6. Small-cell suppression (Government view)

Rule in `web/src/domain/suppression.ts`:

1. A count under **10** is never shown. It shows "<10", not 0.
2. A rate is hidden when the group behind it has fewer than 10 people.
3. **Complementary suppression:** if exactly one cell of a split is hidden, the smallest other cell is hidden too. The hidden one then cannot be worked out from the total.

It is applied in the 3D district map, the facilities table, the programme signals table, the weekly chart and the referral capacity card. A note says "Groups under 10 are hidden to protect privacy". Two demo numbers were set under 10 so the rule is visible. They are still invented.

Limit: the rule covers the cells it is applied to. It is not a full disclosure-control review of the whole view.

## 7. Consent

Consent is per person and per data type. The demo database has a consents table with rows such as emergencies, routine alerts to the family doctor, family circle, home signals and the Abu Dhabi shared record (shown as "planned"). In the live family journey (six people: Moza, Saeed, Khalid, Amna, Hamdan and Hind), each adult chooses in Protect who may see their pathway, and for the two children, Hamdan and Hind, their parent Amna chooses. On an urgent alert nothing new is asked: enrolment consent covers the safety check and the family contact on file is told.

The deployed hospital-agent fails closed: only an active patient-privacy permit Consent for that person shares record categories.

## 8. What happens when Noa is wrong

- The rule that fired is shown, so anyone can see why.
- A person or clinician decides at each step. Noa proposes.
- Choices can be changed. A "later" answer is respected for 3 months.
- Every step is written to a log, and the demo database has an audit table.
- The reporting agent never sees names.
- A real failure found by our own benchmark (run on the earlier Test case prototype): an implausible glucose for a person with diabetes was not blocked. It is fixed and tested. See [test-report.md](test-report.md), section 7.

## 9. References

- DECIDE-AI: reporting guideline for the early-stage clinical evaluation of decision-support systems driven by AI (Vasey et al., 2022).
- WHO, *Ethics and governance of artificial intelligence for health* (2021).
- D'Agostino RB Sr et al. General cardiovascular risk profile for use in primary care. Circulation 2008;117:743-753.

We use these as design references. We do not claim compliance with any of them. DECIDE-AI is for a clinical study, and none has been done.
