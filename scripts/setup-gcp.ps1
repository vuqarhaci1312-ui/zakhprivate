$ErrorActionPreference = 'Stop'
$Gcloud = if (Get-Command gcloud -ErrorAction SilentlyContinue) { 'gcloud' } else { Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd' }
if (-not (Test-Path $Gcloud)) { throw 'Install Google Cloud SDK first' }
$Gsutil = $Gcloud -replace 'gcloud\.cmd$','gsutil.cmd'

$Project = if ($env:GCP_PROJECT) { $env:GCP_PROJECT } else { (& $Gcloud config get-value project 2>$null) }
if (-not $Project) { throw 'Set GCP_PROJECT or run: gcloud config set project YOUR_PROJECT_ID' }

$Bucket = if ($env:GCS_BUCKET) { $env:GCS_BUCKET } else { 'zakher-travel-data' }
$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { 'europe-west1' }

Write-Host "Project: $Project"
& $Gcloud config set project $Project
& $Gcloud services enable run.googleapis.com storage.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

$exists = & $Gsutil ls -b "gs://$Bucket" 2>$null
if (-not $exists) {
  & $Gsutil mb -l $Region "gs://$Bucket"
  Write-Host "Created bucket gs://$Bucket"
} else {
  Write-Host "Bucket exists: gs://$Bucket"
}

& $Gsutil iam ch allUsers:objectViewer "gs://$Bucket"
Write-Host 'Bucket public read enabled for PDF preview.'
Write-Host 'Next: cd backend; npm install; npm run migrate'
