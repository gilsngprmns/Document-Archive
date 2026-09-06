param(
    [string]$BaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = "Stop"
$passed = 0

function Test-Request {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    try {
        $requestParams = @{
            Method = $Method
            Uri = "$BaseUrl$Uri"
            Headers = $Headers
        }

        if ($null -ne $Body) {
            $requestParams.Body = ($Body | ConvertTo-Json -Compress)
            $requestParams.ContentType = "application/json"
        }

        $response = Invoke-RestMethod @requestParams

        if ($response.success -ne $true) {
            throw "Response success bukan true"
        }

        Write-Host "PASS $Name" -ForegroundColor Green
        $script:passed++
        return $response
    } catch {
        Write-Host "FAIL $Name : $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

Write-Host "Testing API: $BaseUrl" -ForegroundColor Cyan

Test-Request -Name "GET root" -Method "GET" -Uri "/" | Out-Null

$username = Read-Host "Username admin (default: admin)"
if ([string]::IsNullOrWhiteSpace($username)) {
    $username = "admin"
}

$securePassword = Read-Host "Password admin" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

$loginResponse = Test-Request `
    -Name "POST login" `
    -Method "POST" `
    -Uri "/api/auth/login" `
    -Body @{ username = $username; password = $password }

$token = $loginResponse.data.token
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Token tidak ditemukan pada response login"
}

Test-Request `
    -Name "GET seksi dengan Bearer token" `
    -Method "GET" `
    -Uri "/api/seksi" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null

Test-Request `
    -Name "GET kategori dengan Bearer token" `
    -Method "GET" `
    -Uri "/api/kategori" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null

Test-Request `
    -Name "GET me dengan Bearer token" `
    -Method "GET" `
    -Uri "/api/auth/me" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null

Write-Host "" 
Write-Host "Berhasil: $passed test" -ForegroundColor Green