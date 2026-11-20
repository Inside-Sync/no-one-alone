# Stores a Claude API key in Secret Manager and gives it to respond-agent. Windows PowerShell 5.1. The key is never printed.
$ErrorActionPreference = "Stop"
$project = "no-one-alone-511616"
$region = "asia-southeast1"
$secret = "anthropic-api-key"
$sa = "respond-agent@$project.iam.gserviceaccount.com"

function Assert-Ok($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }

$secure = Read-Host "Paste the Claude API key (input is hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$tmp = [IO.Path]::GetTempFileName()
try {
    $plain = ([Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)).Trim()
    if (-not $plain.StartsWith("sk-ant-")) { throw "That does not look like a Claude API key (expected sk-ant-...)" }
    [IO.File]::WriteAllText($tmp, $plain, (New-Object Text.UTF8Encoding $false))
    $plain = $null
    gcloud services enable secretmanager.googleapis.com --project $project
    Assert-Ok "Enabling Secret Manager"
    $existing = gcloud secrets list --project $project --filter "name~/$secret$" --format "value(name)"
    Assert-Ok "Listing secrets"
    if ($existing) { gcloud secrets versions add $secret --data-file $tmp --project $project | Out-Null; Assert-Ok "Adding a secret version" }
    else { gcloud secrets create $secret --data-file $tmp --replication-policy automatic --project $project | Out-Null; Assert-Ok "Creating the secret" }
} finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

gcloud secrets add-iam-policy-binding $secret --member "serviceAccount:$sa" --role roles/secretmanager.secretAccessor --project $project --condition None | Out-Null
Assert-Ok "Granting secret access to respond-agent"
gcloud run services update respond-agent --region $region --project $project --update-secrets "ANTHROPIC_API_KEY=${secret}:latest" --quiet
Assert-Ok "Updating respond-agent"
Write-Output "Done: respond-agent now reads ANTHROPIC_API_KEY from Secret Manager ($secret)."
