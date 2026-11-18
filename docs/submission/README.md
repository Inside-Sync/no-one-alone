# No One Alone Abu Dhabi: submission guide

Future Health Digital Innovation Challenge, Department of Health Abu Dhabi.

**We help Abu Dhabi families and their family health centres get every due check done and every result to care, using one Family Health Passport that joins home signals, family history and records from every site the family uses.**

All people, places, facilities and numbers in the product are fictional. Noa supports decisions. A clinician or the person decides.

## Try it (no login, microphone optional)

| What | Link |
|---|---|
| Live site | https://noonealone.insidesync.ai |
| Whole family (start here) | https://noonealone.insidesync.ai/?test=family |
| Stroke at night | https://noonealone.insidesync.ai/?test=stroke |
| For judges tab | https://noonealone.insidesync.ai/?test=judges |
| Benchmark tab | https://noonealone.insidesync.ai/?test=bench |
| Claude prototype (the design the Test case follows) | https://claude.ai/artifact/U62CJAJZuVGoQ87F3uGB9P |

The Test case also opens from the button in the header and from the banner under it, on every page. It works in English and Arabic.

The live site is shared by everyone who opens it. The Test case runs in your own browser, so other visitors do not affect it.

## What to look at in 5 minutes

1. **For judges tab, "Judge path" (about 3 minutes).** Khalid books a check with one tap, then the whole family, then a stroke at night.
2. **Whole family case.** One passport for 8 people in 4 generations. Edit a profile and watch the alerts and the Noa Forecast heart-risk figures change. Forecast shows only when it is valid (ages 30 to 74, no heart attack or stroke).
3. **Stroke case, "Run it for me".** Sensor readings play minute by minute. A published rule (R1 to R12) decides. Then the 998 call, the pre-arrival packet and the teach-back in English and Arabic.
4. **Gate strip and provenance labels** on every step. Gates: Consent, Enough data, Urgent bypass, Rule decision, Human approval. Every value is labelled Observed, Calculated, AI-written or Clinician confirmed.
5. **Benchmark tab, press Run.** 249 labelled synthetic scenarios go through the real rule engine. 248 match the rule table. For "998 now": sensitivity 46 of 46, specificity 83 of 83. This checks that Noa follows its own rules. It is not clinical validation.
6. **Government view.** Counts under 10 show "<10" (small-cell suppression).

## What is built, and what is not

- **Built and deployed:** the web app, core-api, respond-agent and hospital-agent on Google Cloud, with a FHIR R4 store (all synthetic data).
- **Built in the Test case:** a deterministic rules engine that runs in the browser. The 9 Noa agents are roles inside it.
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
npm run dev                  # open any page with ?test=family
npm run benchmark:report     # rewrites test-report.md
```
