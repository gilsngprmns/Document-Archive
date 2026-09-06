$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http

if ([string]::IsNullOrWhiteSpace($env:TOKEN)) {
    throw "TOKEN belum tersedia. Login dulu lalu set TOKEN di CMD."
}

$filePath = Join-Path (Get-Location) "test-upload.pdf"
if (-not (Test-Path $filePath)) {
    throw "File test-upload.pdf tidak ditemukan di folder backend."
}

$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $env:TOKEN)
$form = New-Object System.Net.Http.MultipartFormDataContent

function Add-TextField {
    param([string]$Name, [string]$Value)

    $content = New-Object System.Net.Http.StringContent($Value)
    $form.Add($content, $Name)
}

Add-TextField "nomor_dokumen" "TEST-001"
Add-TextField "judul" "Dokumen Testing"
Add-TextField "seksi_id" "1"
Add-TextField "kategori_id" "1"
Add-TextField "tanggal_dokumen" "2026-09-05"
Add-TextField "tahun" "2026"
Add-TextField "deskripsi" "Dokumen untuk pengujian upload"

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileContent = New-Object System.Net.Http.ByteArrayContent(,$fileBytes)
$fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf")
$form.Add($fileContent, "file", "test-upload.pdf")

$response = $client.PostAsync("http://localhost:5000/api/dokumen", $form).Result
$responseBody = $response.Content.ReadAsStringAsync().Result
Write-Host $responseBody

if (-not $response.IsSuccessStatusCode) {
    exit 1
}