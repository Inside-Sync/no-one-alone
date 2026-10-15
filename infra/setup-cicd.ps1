# One-time setup so GitHub Actions can deploy with Workload Identity Federation (no keys). Windows PowerShell 5.1.
# Needs gcloud logged in as a project owner and gh logged in with admin on the repo. Safe to re-run.
param(
    [Parameter(Mandatory = $true)] [string] $ProjectId,
    [string] $Repo = "Inside-Sync/no-one-alone"
)

function Step([string] $Desc, [scriptblock] $Cmd) {
    Write-Host ""
    Write-Host "==> $Desc" -ForegroundColor Cyan
    & $Cmd
    if ($LASTEXITCODE -ne 0) { Write-Warning "$Desc exited with $LASTEXITCODE. If it says the resource already exists, ignore it." }
}

$sa = "github-deployer@$ProjectId.iam.gserviceaccount.com"
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"

Step "Service account github-deployer" { gcloud iam service-accounts create github-deployer --display-name=github-deployer --project $ProjectId }

$roles = @(
    "roles/run.admin", "roles/iam.serviceAccountUser", "roles/cloudbuild.builds.editor",
    "roles/storage.admin", "roles/artifactregistry.writer", "roles/serviceusage.serviceUsageConsumer",
    "roles/secretmanager.viewer", "roles/pubsub.editor",
    "roles/firebasehosting.admin", "roles/firebaserules.admin", "roles/firebasestorage.admin"
)
foreach ($role in $roles) {
    Step "Grant $role to github-deployer" {
        gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$sa" --role=$role --condition=None --quiet | Out-Null
    }
}

Step "Artifact Registry repo for source deploys" {
    gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=asia-southeast1 --project $ProjectId
}

Step "Workload identity pool github" {
    gcloud iam workload-identity-pools create github --location=global --display-name=github --project $ProjectId
}
Step "OIDC provider github (only $Repo)" {
    gcloud iam workload-identity-pools providers create-oidc github --location=global --workload-identity-pool=github `
        --issuer-uri="https://token.actions.githubusercontent.com" `
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" `
        --attribute-condition="assertion.repository=='$Repo'" --project $ProjectId
}
Step "Let $Repo act as github-deployer" {
    gcloud iam service-accounts add-iam-policy-binding $sa --project $ProjectId --role="roles/iam.workloadIdentityUser" `
        --member="principalSet://iam.googleapis.com/projects/$projectNumber/locations/global/workloadIdentityPools/github/attribute.repository/$Repo" --format=none
}

$provider = "projects/$projectNumber/locations/global/workloadIdentityPools/github/providers/github"
Step "Repo variable GCP_PROJECT_ID" { gh variable set GCP_PROJECT_ID --repo $Repo --body $ProjectId }
Step "Repo variable GCP_WIF_PROVIDER" { gh variable set GCP_WIF_PROVIDER --repo $Repo --body $provider }
Step "Repo variable GCP_DEPLOY_SA" { gh variable set GCP_DEPLOY_SA --repo $Repo --body $sa }
Step "Repo variable AUTH_ENABLED (false until the web sends Firebase ID tokens)" { gh variable set AUTH_ENABLED --repo $Repo --body false }

Write-Host ""
Write-Host "Done. Every green CI run on dev now deploys the parts that changed. Manual run: Actions > Deploy > Run workflow." -ForegroundColor Green
