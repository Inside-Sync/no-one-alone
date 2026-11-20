# No One Alone Abu Dhabi: submission guide

Future Health Digital Innovation Challenge, Department of Health Abu Dhabi.

**We help Abu Dhabi families and their family health centres get every due check done and every result to care, using one Family Health Passport that joins home signals, family history and records from every site the family uses.**

All people, places, facilities and numbers in the product are fictional. Noa supports decisions. A clinician or the person decides.

## Try it (no login, microphone optional)

| What | Link |
|---|---|
| Live site (opens on Family health) | https://noonealone.insidesync.ai |
| Family health: Noa's family journey | https://noonealone.insidesync.ai/individual/lineage |
| Hospital view | https://noonealone.insidesync.ai/hospital/overview |
| Government view: prevention and screening | https://noonealone.insidesync.ai/government/population |
| Design prototype (the design the web follows) | https://claude.ai/artifact/U62CJAJZuVGoQ87F3uGB9P |

The Family health tab opens first and plays Saeed's demo by itself. Press **Next** (or the → key) to step through, answer as the person yourself, tap anyone in the family tree, or run a quick test case below the panel. It works in English and Arabic.

The live site is shared by everyone who opens it. The family journey runs in your own browser, so other visitors do not affect it. When the live AI switch is on (off by default), the agents' wording goes through the backend.

## What to look at in 5 minutes

1. **Saeed, the demo start.** A racing heart on his watch prompts a check by itself: speech check against his own voice, red-flag questions, then the right pathway. Detect, Protect, Home screening, Right pathway, Referral.
2. **Tap Khalid in the family tree.** His record opens. He can switch his genomic result off (rule P1). The pathway keeps what Noa may book (population priority) apart from what only the doctor decides. Say "Not now": routine checks pause for 3 months, urgent items still go to the doctor (rule U1).
3. **Quick test case "Saeed · speech clearly changed".** Noa advises seeing a doctor now with a fixed, clinician-approved script that never goes through AI, and pauses screening.
4. **Agent orchestra, beside the journey.** An Orchestrator and four agents (Personal care, Screening, Specialist, Government). Every hand-off names its rule and shows consent and logging. Every message is labelled Live AI, Prepared, Fixed script or Guardrail.
5. **Government view, Prevention and screening.** Reach, recommendation, uptake, false positives, missed cases and calibration by group. Groups under 10 people are hidden.
6. **[test-report.md](test-report.md).** 252 labelled synthetic scenarios run through the rule engine: all 252 match the rule table; for "998 now", sensitivity 49 of 49 and specificity 83 of 83. This checks that Noa follows its own rules. It is not clinical validation.

## What is built, and what is not

- **Built and deployed:** the web app, core-api, respond-agent and hospital-agent on Google Cloud, with a FHIR R4 store (all synthetic data).
- **Built in the family journey:** a deterministic rules engine that runs in the browser: the Orchestrator's rules pick every next agent. When the live AI switch is on, Claude writes the wording of agent messages from the facts the rules chose and reads typed replies into one of the card's options. Every message still has prepared text behind it and shows its source: Live AI, Prepared, Fixed script or Guardrail. Emergency advice is always a fixed script.
- **Planned, not built:** Malaffi and HL7 link, a production audit log, UAE hosting, clinical sign-off of the rules and scripts.

## The other documents

| Document | What it covers |
|---|---|
| [architecture.md](architecture.md) | Production today, the Test case, and what is planned. |
| [responsible-ai.md](responsible-ai.md) | Gates, labels, guardrails, consent, Framingham limits, small-cell suppression, when Noa is wrong. |
| [data-and-assumptions.md](data-and-assumptions.md) | Data sources, assumptions, limitations. |
| [pilot.md](pilot.md) | Path to pilot, proposed success measures, deployment needs. |
| [test-report.md](test-report.md) | Generated benchmark report (`npm run benchmark:report`). Every scenario is listed. |
| [../data-contract.md](../data-contract.md) | The fields the backend sends to the web. |
| [../../README.md](../../README.md) | Repository setup, run locally, deploy, CI/CD. |

## Run it yourself

```
cd web
npm ci
npm run dev                  # opens on Individual > Family health
npm run benchmark:report     # rewrites test-report.md
```
