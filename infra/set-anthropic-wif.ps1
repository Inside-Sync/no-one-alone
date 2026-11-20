# Points respond-agent at the Claude API through Workload Identity Federation. Windows PowerShell 5.1. No secrets: the ids are not credentials.
param(
    [Parameter(Mandatory = $true)] [string] $RuleId,
    [Parameter(Mandatory = $true)] [string] $OrgId,
    [Parameter(Mandatory = $true)] [string] $ServiceAccountId,
    [Parameter(Mandatory = $true)] [string] $WorkspaceId
)
# Undo: gcloud run services update respond-agent --region asia-southeast1 --project no-one-alone-511616 --remove-env-vars ANTHROPIC_FEDERATION_RULE_ID,ANTHROPIC_ORGANIZATION_ID,ANTHROPIC_SERVICE_ACCOUNT_ID,ANTHROPIC_WORKSPACE_ID
$ErrorActionPreference = "Stop"
$project = "no-one-alone-511616"
$region = "asia-southeast1"

function Assert-Ok($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }

if (-not $RuleId.StartsWith("fdrl_")) { throw "RuleId must start with fdrl_" }
if (-not $ServiceAccountId.StartsWith("svac_")) { throw "ServiceAccountId must start with svac_" }
if (-not $WorkspaceId.StartsWith("wrkspc_")) { throw "WorkspaceId must start with wrkspc_" }
$guid = [guid]::Empty
if (-not [guid]::TryParse($OrgId, [ref] $guid)) { throw "OrgId must be a UUID" }

$vars = "ANTHROPIC_FEDERATION_RULE_ID=$RuleId,ANTHROPIC_ORGANIZATION_ID=$OrgId,ANTHROPIC_SERVICE_ACCOUNT_ID=$ServiceAccountId,ANTHROPIC_WORKSPACE_ID=$WorkspaceId"
gcloud run services update respond-agent --region $region --project $project --update-env-vars $vars --quiet
Assert-Ok "Updating respond-agent"
Write-Output "Done: respond-agent reaches the Claude API through Workload Identity Federation."
