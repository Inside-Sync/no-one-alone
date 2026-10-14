# No One Alone

An AI care agent for older people living alone. When a wearable raises a critical alert, the agent checks whether it is real, talks to the person in their own regional form of address, decides how urgent it is, and gets the right family member to the door. For a suspected stroke it sends a pre-arrival packet to a stroke-ready hospital before the ambulance arrives.

Entry for the Google Cloud AI Builder Cup, Sustainability & Social Impact. Live demo: https://noonealone.insidesync.ai

All people, places and medical records in this repo are fictional.

## Architecture

| Part | Folder | Runtime | Owner |
|---|---|---|---|
| Web app (person, family, hospital and demo screens) | `web/` | Firebase Hosting | Hải |
| core-api: incident state machine, escalation timers, Maps | `core-api/` | Cloud Run, Java 17, Spring Boot | Dũng |
| respond-agent: verify, voice check-in, triage, escalation plan | `agents/respond/` | Cloud Run, Python, ADK, Gemini, Chirp 3 HD | Tài |
| hospital-agent: FHIR pre-arrival packet over A2A | `agents/hospital/` | Cloud Run, Python, ADK, Cloud Healthcare API | Minh |
| Synthetic data and forecast job | `data/` | BigQuery `AI.FORECAST`, Firestore | Minh, Dũng |
| Project setup and deploy scripts | `infra/` | gcloud, Firebase CLI | Dũng |

Data shapes and every interface are in [docs/contract.md](docs/contract.md). Read it before writing code; change it through a PR.

## Setup (once)

Prerequisites: Google Cloud CLI, Firebase CLI, Java 17, Python 3.12, Docker.

```
gcloud auth login
gcloud auth application-default login
firebase login
powershell -ExecutionPolicy Bypass -File infra\setup.ps1 -ProjectId <project-id> -BillingAccount <billing-id> -TeamEmails "a@example.com","b@example.com"
```

Then set the project ID in `.firebaserc` and finish the three console steps the script prints.

## Run locally

```
cd core-api
mvn spring-boot:run
```

```
cd agents\respond
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn main:app --port 8081
```

## Deploy

```
powershell -ExecutionPolicy Bypass -File infra\deploy.ps1 -ProjectId <project-id> -Target all
```

`-Target` is `all`, `core-api`, `respond`, `hospital` or `web`.

core-api feature flags live in `$flags` in the core-api block of `infra/deploy.ps1`.
