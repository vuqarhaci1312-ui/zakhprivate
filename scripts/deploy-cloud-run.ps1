$ErrorActionPreference = 'Stop'
$Gcloud = if (Get-Command gcloud -ErrorAction SilentlyContinue) { 'gcloud' } else { Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd' }
if (-not (Test-Path $Gcloud)) { throw 'Install Google Cloud SDK first' }

$Project = if ($env:GCP_PROJECT) { $env:GCP_PROJECT } else { (& $Gcloud config get-value project 2>$null) }
if (-not $Project) { throw 'Set GCP_PROJECT or run: gcloud config set project YOUR_PROJECT_ID' }

$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { 'europe-west1' }
$Service = if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { 'zakher-api' }
$Bucket = if ($env:GCS_BUCKET) { $env:GCS_BUCKET } else { 'zakher-travel-data' }

Push-Location (Join-Path $PSScriptRoot '..\backend')
$EnvFile = Join-Path (Get-Location) 'env.yaml'
try {
  & $Gcloud run deploy $Service `
    --source . `
    --region $Region `
    --allow-unauthenticated `
    --env-vars-file $EnvFile
} finally {
  Pop-Location
}

$Url = (& $Gcloud run services describe $Service --region $Region --format='value(status.url)').Trim()
Write-Host "API URL: $Url"

$configPath = Join-Path $PSScriptRoot '..\js\config.js'
$config = @"
window.ZAKHER_API_BASE = '$Url';
window.ZAKHER_GCS_BUCKET = '$Bucket';
window.ZAKHER_GCS_PDF_BASE = 'https://storage.googleapis.com/$Bucket';
"@
Set-Content -Path $configPath -Value $config -Encoding UTF8
Write-Host 'Updated js/config.js'
