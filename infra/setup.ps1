# One-time GCP setup for No One Alone. Windows PowerShell 5.1.
# Safe to re-run: steps that already exist print a warning and continue.
param(
    [Parameter(Mandatory = $true)] [string] $ProjectId,
    [Parameter(Mandatory = $true)] [string] $BillingAccount,
    [string[]] $TeamEmails = @(),
    [string] $Region = "asia-southeast1"
)

function Step([string] $Desc, [scriptblock] $Cmd) {
    Write-Host ""
    Write-Host "==> $Desc" -ForegroundColor Cyan
    & $Cmd
    if ($LASTEXITCODE -ne 0) { Write-Warning "$Desc exited with $LASTEXITCODE. If it says the resource already exists, ignore it." }
}

Step "Create project $ProjectId" { gcloud projects create $ProjectId --name="No One Alone" }
Step "Set default project" { gcloud config set project $ProjectId }
Step "Link billing" { gcloud billing projects link $ProjectId --billing-account=$BillingAccount }

$apis = @(
    "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com",
    "firestore.googleapis.com", "pubsub.googleapis.com", "cloudtasks.googleapis.com",
    "healthcare.googleapis.com", "bigquery.googleapis.com", "aiplatform.googleapis.com",
    "texttospeech.googleapis.com", "routes.googleapis.com", "secretmanager.googleapis.com",
    "iam.googleapis.com", "iamcredentials.googleapis.com", "storage.googleapis.com",
    "firebase.googleapis.com", "identitytoolkit.googleapis.com", "firebasestorage.googleapis.com",
    "apikeys.googleapis.com"
)
Step "Enable APIs (takes 1 to 3 minutes)" { gcloud services enable @apis }

# Service accounts: one per runtime, plus one identity for Pub/Sub push and Cloud Tasks OIDC.
$sas = @("core-api", "respond-agent", "hospital-agent", "invoker")
foreach ($sa in $sas) {
    Step "Service account $sa" { gcloud iam service-accounts create $sa --display-name=$sa }
}

function Grant([string] $Sa, [string[]] $Roles) {
    foreach ($role in $Roles) {
        Step "Grant $role to $Sa" {
            gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$Sa@$ProjectId.iam.gserviceaccount.com" --role=$role --condition=None --quiet | Out-Null
        }
    }
}

Grant "core-api" @("roles/datastore.user", "roles/pubsub.publisher", "roles/cloudtasks.enqueuer",
                   "roles/cloudtasks.taskDeleter", "roles/storage.objectAdmin", "roles/run.invoker",
                   "roles/secretmanager.secretAccessor")
Grant "respond-agent" @("roles/aiplatform.user", "roles/run.invoker")
Grant "hospital-agent" @("roles/aiplatform.user", "roles/healthcare.fhirResourceReader")
Grant "invoker" @("roles/run.invoker")

# core-api creates Cloud Tasks that carry the invoker identity.
Step "Allow core-api to act as invoker" {
    gcloud iam service-accounts add-iam-policy-binding "invoker@$ProjectId.iam.gserviceaccount.com" --member="serviceAccount:core-api@$ProjectId.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser" --quiet | Out-Null
}

# ponytail: editor for the whole team is fine for a 4-day hackathon project; tighten if it lives on.
foreach ($email in $TeamEmails) {
    Step "Team access for $email" {
        gcloud projects add-iam-policy-binding $ProjectId --member="user:$email" --role="roles/editor" --condition=None --quiet | Out-Null
    }
}

# gcloud run deploy --source builds with Cloud Build as the default compute service account.
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
foreach ($role in @("roles/run.builder", "roles/artifactregistry.writer", "roles/logging.logWriter")) {
    Step "Grant $role to the build service account" {
        gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$projectNumber-compute@developer.gserviceaccount.com" --role=$role --condition=None --quiet | Out-Null
    }
}
Step "Firestore (native)" { gcloud firestore databases create --location=$Region --type=firestore-native }
Step "Pub/Sub topic alerts" { gcloud pubsub topics create alerts }
Step "Cloud Tasks queue escalation" { gcloud tasks queues create escalation --location=$Region }
Step "Healthcare dataset noa" { gcloud healthcare datasets create noa --location=$Region }
Step "FHIR R4 store records" { gcloud healthcare fhir-stores create records --dataset=noa --location=$Region --version=R4 }
Step "BigQuery dataset noa" { bq --location=$Region mk --dataset "$($ProjectId):noa" }

Step "Maps API key restricted to Routes" {
    gcloud services api-keys create --display-name=routes-key --api-target=service=routes.googleapis.com
}
$keyName = gcloud services api-keys list --filter="displayName=routes-key" --format="value(name)" | Select-Object -First 1
if ($keyName) {
    $keyString = gcloud services api-keys get-key-string $keyName --format="value(keyString)"
    Step "Secret maps-api-key" { gcloud secrets create maps-api-key --replication-policy=automatic }
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $keyString)
    Step "Store Maps key in Secret Manager" { gcloud secrets versions add maps-api-key --data-file=$tmp | Out-Null }
    Remove-Item $tmp
}

Step "Add Firebase to the project" { firebase projects:addfirebase $ProjectId }
Step "Create Firebase web app" { firebase apps:create web noa-web --project $ProjectId }

Write-Host ""
Write-Host "Done. Three steps left in the Firebase console (no CLI for them):" -ForegroundColor Green
Write-Host "  1. Authentication > Sign-in method > enable Anonymous"
Write-Host "  2. Storage > Get started > location $Region"
Write-Host "  3. Project settings > Your apps > noa-web > copy the firebaseConfig for Hai"
Write-Host "Console: https://console.firebase.google.com/project/$ProjectId"
