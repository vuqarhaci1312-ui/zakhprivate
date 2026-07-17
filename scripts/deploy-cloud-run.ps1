$ErrorActionPreference = 'Stop'
$Gcloud = if (Get-Command gcloud -ErrorAction SilentlyContinue) { 'gcloud' } else { Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd' }
if (-not (Test-Path $Gcloud)) { throw 'Install Google Cloud SDK first' }

$Project = if ($env:GCP_PROJECT) { $env:GCP_PROJECT } else { (& $Gcloud config get-value project 2>$null) }
if (-not $Project) { throw 'Set GCP_PROJECT or run: gcloud config set project YOUR_PROJECT_ID' }

$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { 'europe-west1' }
$Service = if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { 'zakher-api' }
$Bucket = if ($env:GCS_BUCKET) { $env:GCS_BUCKET } else { 'zakher-travel-data' }

$AdminUser = if ($env:ADMIN_USERNAME) { $env:ADMIN_USERNAME } else { 'zakher_admin' }
$AdminPass = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { 'Z@kher#2026$Secure!' }
$TokenSecret = if ($env:TOKEN_SECRET) { $env:TOKEN_SECRET } else { 'xK9mP2vL8qR4wN7' }
$Origins = 'https://zakherprivate.vercel.app,https://zakhprivate.vercel.app,http://localhost:8080,http://127.0.0.1:8080'

& $Gcloud config set project $Project

Push-Location (Join-Path $PSScriptRoot '..\backend')
try {
  & $Gcloud run deploy $Service `
    --source . `
    --region $Region `
    --allow-unauthenticated `
    --set-env-vars "GCS_BUCKET=$Bucket,ADMIN_USERNAME=$AdminUser,ADMIN_PASSWORD=$AdminPass,TOKEN_SECRET=$TokenSecret,ALLOWED_ORIGINS=$Origins"
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
