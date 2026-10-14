# Deploy one or all parts. Windows PowerShell 5.1. Run from anywhere.
# Cloud Run builds from each Dockerfile through Cloud Build (gcloud run deploy --source).
param(
    [Parameter(Mandatory = $true)] [string] $ProjectId,
    [ValidateSet("all", "core-api", "respond", "hospital", "web")] [string] $Target = "all",
    [string] $Region = "asia-southeast1",
    [switch] $AuthEnabled
)

$root = Split-Path -Parent $PSScriptRoot

function Deploy-Run([string] $Service, [string] $Dir, [string] $Sa, [bool] $Public) {
    $auth = if ($Public) { "--allow-unauthenticated" } else { "--no-allow-unauthenticated" }
    Write-Host "==> Deploy $Service" -ForegroundColor Cyan
    gcloud run deploy $Service --source "$root\$Dir" --region $Region --project $ProjectId `
        --service-account "$Sa@$ProjectId.iam.gserviceaccount.com" $auth --quiet
    if ($LASTEXITCODE -ne 0) { throw "Deploy of $Service failed" }
}

if ($Target -in "all", "respond") { Deploy-Run "respond-agent" "agents\respond" "respond-agent" $false }
if ($Target -in "all", "hospital") { Deploy-Run "hospital-agent" "agents\hospital" "hospital-agent" $false }
# core-api is public because Firebase Hosting rewrites need it; it checks tokens itself (contract section 6).
if ($Target -in "all", "core-api") {
    $authFlag = if ($AuthEnabled) { "true" } else { "false" }
    $flags = "RESPOND_AGENT_AUTH=true,PUBSUB_ENABLED=true,TASKS_ENABLED=true,AUDIO_ENABLED=true,AUTH_ENABLED=$authFlag"
    $agentUrl = gcloud run services describe respond-agent --region $Region --project $ProjectId --format="value(status.url)"
    if (-not $agentUrl) { throw "respond-agent is not deployed; deploy it first" }
    Write-Host "==> Deploy core-api" -ForegroundColor Cyan
    gcloud run deploy core-api --source "$root\core-api" --region $Region --project $ProjectId `
        --service-account "core-api@$ProjectId.iam.gserviceaccount.com" --allow-unauthenticated `
        --no-cpu-throttling --memory 1Gi --timeout 300 `
        --set-env-vars "GOOGLE_CLOUD_PROJECT=$ProjectId,RESPOND_AGENT_URL=$agentUrl,INVOKER_EMAIL=invoker@$ProjectId.iam.gserviceaccount.com,AUDIO_BUCKET=$ProjectId.firebasestorage.app,$flags" `
        --set-secrets "MAPS_API_KEY=maps-api-key:latest" --quiet
    if ($LASTEXITCODE -ne 0) { throw "Deploy of core-api failed" }
    $coreUrl = gcloud run services describe core-api --region $Region --project $ProjectId --format="value(status.url)"
    gcloud run services update core-api --region $Region --project $ProjectId --update-env-vars "CORE_API_URL=$coreUrl" --quiet
    gcloud pubsub subscriptions describe alerts-push --project $ProjectId 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        gcloud pubsub subscriptions create alerts-push --project $ProjectId --topic alerts `
            --push-endpoint "$coreUrl/alerts" `
            --push-auth-service-account "invoker@$ProjectId.iam.gserviceaccount.com" `
            --push-auth-token-audience $coreUrl --ack-deadline 120
        if ($LASTEXITCODE -ne 0) { throw "Create of alerts-push failed" }
    }
}
if ($Target -in "all", "web") {
    Write-Host "==> Deploy web, Firestore and Storage rules" -ForegroundColor Cyan
    Push-Location $root
    firebase deploy --only "hosting,firestore:rules,storage" --project $ProjectId
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { throw "Firebase deploy failed" }
}
