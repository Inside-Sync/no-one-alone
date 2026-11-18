# Copies the Azure Speech key into Secret Manager and lets respond-agent read it. Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)] [string] $ProjectId
)

$k = az cognitiveservices account keys list --name noa-speech-uaen --resource-group noa-speech --query key1 -o tsv
if (-not $k) { throw "Could not read the Azure Speech key; run az login first" }
$tmp = [System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllText($tmp, $k)
    gcloud secrets describe azure-speech-key --project $ProjectId *> $null
    if ($LASTEXITCODE -ne 0) {
        gcloud secrets create azure-speech-key --project $ProjectId --replication-policy=automatic
        if ($LASTEXITCODE -ne 0) { throw "Creating secret azure-speech-key failed" }
    }
    gcloud secrets versions add azure-speech-key --project $ProjectId --data-file=$tmp | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Adding a version to azure-speech-key failed" }
    gcloud secrets add-iam-policy-binding azure-speech-key --project $ProjectId `
        --member "serviceAccount:respond-agent@$ProjectId.iam.gserviceaccount.com" --role roles/secretmanager.secretAccessor | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Granting respond-agent access to azure-speech-key failed" }
    Write-Host "azure-speech-key stored; run infra/deploy.ps1 -Target respond to pick it up"
} finally {
    Remove-Item $tmp
}
