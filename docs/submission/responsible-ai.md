# Responsible AI, safety and data governance

Noa is **decision support, not diagnosis**. A person or a clinician decides every step that matters. All data is fictional.

## 1. Gates

Every Test case step shows five gates, read from the engine state (`web/src/features/testcase/ui/app/Gates.tsx`). Each shows pass, hold, pending or bypassed, with a reason.

| Gate | Rule |
|---|---|
| Consent | No consent row, or nobody chosen to see the plan: hold. |
| Enough data | A missing or implausible required value blocks the run. Missing "recommended" values only warn. |
| Urgent bypass | A red or 998 path skips the routine flow. |
| Rule decision | The deciding rule and its name are shown (R1 to R12, P1 to P9, F1, F2). |
| Human approval | The action waits until a person or clinician accepts it. |

## 2. Provenance labels

Every card, database row and log line carries a label. It is always a word (colour only helps). Source: `ui/app/Provenance.tsx`.

- **Observed:** from a sensor, or entered or chosen by the person.
- **Calculated:** from a rule, a score or Framingham.
- **Prepared text:** explanatory wording written and checked by the team.
- **AI-written:** explanatory wording from a live AI model; shown only when one is used.
- **Live AI:** in the family journey, wording a model wrote for one agent message, shown only after the server checks passed.
- **Clinician confirmed:** a clinician accepted it.

## 3. Input guardrails

Every number a person can type has a plausible range (`engine/inputs.ts`). There are two levels.

- **Required:** the decision cannot be taken on it. A missing or implausible value (heart rate 400, oxygen 150%) is refused with an explanation. The previous valid value stays and the run waits.
- **Recommended:** a warning, and the flow continues. Example: cholesterol is not measured, so the BMI version of the score is used and the screen says so.

Family profile values are kept inside their range, with a warning.

What a Claude call receives (live AI switch on, off by default): the structured facts for that one call, with no free text except the person's own typed reply. For a message, that is the agent, the language, the reader and the facts the rules chose, which include a first name where the card shows one. For a typed reply, it is the question, the options and the reply. The teach-card explanation sends only the card key and the language. The call goes to the Claude API (outside Google Cloud) when `ANTHROPIC_API_KEY` is set, otherwise to Claude on Vertex AI.

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

Consent is per person and per data type. The demo database has a consents table with rows such as emergencies, routine alerts to the family doctor, family circle, home signals and the Abu Dhabi shared record (shown as "planned"). In the family case each adult's record has its own status (for example Sultan's is private). Children's records follow a parent.

The deployed hospital-agent fails closed: only an active patient-privacy permit Consent for that person shares record categories.

## 8. What happens when Noa is wrong

- The rule that fired is shown, so anyone can see why.
- A person or clinician decides at each step. Noa proposes.
- Choices can be changed. A "later" answer is respected for 3 months.
- Every step is written to a log, and the demo database has an audit table.
- The reporting agent never sees names.
- The For judges tab says where the demo runs.
- A real failure found by our own benchmark: an implausible glucose for a person with diabetes was not blocked. It is fixed and tested. See [test-report.md](test-report.md), section 7.

## 9. References

- DECIDE-AI: reporting guideline for the early-stage clinical evaluation of decision-support systems driven by AI (Vasey et al., 2022).
- WHO, *Ethics and governance of artificial intelligence for health* (2021).
- D'Agostino RB Sr et al. General cardiovascular risk profile for use in primary care. Circulation 2008;117:743-753.

We use these as design references. We do not claim compliance with any of them. DECIDE-AI is for a clinical study, and none has been done.
