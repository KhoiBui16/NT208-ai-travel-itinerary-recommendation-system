param(
    [string]$ApiBaseUrl = "http://localhost:8000/api/v1",
    [string]$FrontendUrl = "http://127.0.0.1:5173",
    [switch]$StartStack,
    [switch]$StartFrontend,
    [switch]$SkipFrontendBuild,
    [switch]$SkipCodeGates
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendProcess = $null
$oldCi = $env:CI

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-External {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$File,
        [string[]]$Arguments
    )

    Write-Step $Name
    Push-Location $WorkingDirectory
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Name failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $options = @{
        Method = $Method
        Uri = $Uri
        Headers = $Headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $options.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    Invoke-RestMethod @options
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

try {
    if ($StartStack) {
        Invoke-External `
            -Name "Start Docker stack" `
            -WorkingDirectory $repoRoot `
            -File "docker" `
            -Arguments @("compose", "up", "-d", "db", "redis", "api")
    }

    if ($StartFrontend) {
        Write-Step "Start frontend dev server"
        $npmCommand = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
        if (-not $npmCommand) {
            $npmCommand = Get-Command npm -ErrorAction Stop
        }
        $frontendProcess = Start-Process `
            -FilePath $npmCommand.Source `
            -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") `
            -WorkingDirectory (Join-Path $repoRoot "Frontend") `
            -WindowStyle Hidden `
            -PassThru
        Start-Sleep -Seconds 8
    }

    if (-not $SkipCodeGates) {
        Invoke-External `
            -Name "Backend lint" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "ruff", "check", "src", "tests")

        Invoke-External `
            -Name "Backend format check" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "ruff", "format", "--check", "src", "tests")

        Invoke-External `
            -Name "Backend migrations upgrade" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "alembic", "upgrade", "head")

        Invoke-External `
            -Name "Backend migrations drift check" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "alembic", "check")

        Invoke-External `
            -Name "Backend unit tests" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "pytest", "tests/unit/", "-q", "--tb=short", "-p", "no:cacheprovider")

        $env:CI = "true"
        Invoke-External `
            -Name "Backend integration tests" `
            -WorkingDirectory (Join-Path $repoRoot "Backend") `
            -File "uv" `
            -Arguments @("run", "pytest", "tests/integration/", "-q", "--tb=short", "-p", "no:cacheprovider")
        $env:CI = $oldCi

        if (-not $SkipFrontendBuild) {
            Invoke-External `
                -Name "Frontend production build" `
                -WorkingDirectory (Join-Path $repoRoot "Frontend") `
                -File "npm" `
                -Arguments @("run", "build")
        }
    }

    Write-Step "Backend health"
    $health = Invoke-Json -Method "GET" -Uri "$ApiBaseUrl/health"
    Assert-True ($health.status -eq "healthy") "Backend health did not return healthy."

    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $password = "password123"
    $email = "smoke+$stamp@example.com"
    $name = "Smoke Tester $stamp"

    Write-Step "Register user and read profile"
    $register = Invoke-Json -Method "POST" -Uri "$ApiBaseUrl/auth/register" -Body @{
        email = $email
        password = $password
        name = $name
        phone = "0900000000"
    }
    Assert-True ($register.accessToken.Length -gt 20) "Register did not return accessToken."
    Assert-True ($register.refreshToken.Length -gt 20) "Register did not return refreshToken."

    $headers = @{ Authorization = "Bearer $($register.accessToken)" }
    $profile = Invoke-Json -Method "GET" -Uri "$ApiBaseUrl/users/profile" -Headers $headers
    Assert-True ($profile.email -eq $email) "Profile email mismatch."

    Write-Step "Update profile"
    $updatedProfile = Invoke-Json -Method "PUT" -Uri "$ApiBaseUrl/users/profile" -Headers $headers -Body @{
        name = "Smoke Updated"
        phone = "0911111111"
        interests = @("food", "nature")
    }
    Assert-True ($updatedProfile.name -eq "Smoke Updated") "Profile update failed."

    Write-Step "Create authenticated trip"
    $trip = Invoke-Json -Method "POST" -Uri "$ApiBaseUrl/itineraries" -Headers $headers -Body @{
        destination = "Hà Nội"
        tripName = "Smoke Trip $stamp"
        startDate = "2026-06-01"
        endDate = "2026-06-03"
        budget = 5000000
        adultsCount = 2
        childrenCount = 0
        interests = @("food", "culture")
    }
    Assert-True ($trip.id -gt 0) "Trip create did not return id."
    $tripId = $trip.id

    Write-Step "Update nested trip data"
    $updatedTrip = Invoke-Json -Method "PUT" -Uri "$ApiBaseUrl/itineraries/$tripId" -Headers $headers -Body @{
        tripName = "Smoke Trip Updated $stamp"
        budget = 5200000
        days = @(
            @{
                label = "Ngày 1"
                date = "2026-06-01"
                destinationName = "Hà Nội"
                activities = @(
                    @{
                        time = "08:00"
                        endTime = "09:30"
                        name = "Hồ Gươm"
                        location = "Hoàn Kiếm"
                        description = "Đi bộ quanh hồ"
                        type = "attraction"
                        image = ""
                        transportation = "walk"
                        adultPrice = 0
                        childPrice = 0
                        customCost = 100000
                        busTicketPrice = 0
                        taxiCost = 0
                        extraExpenses = @()
                    }
                )
                extraExpenses = @()
            }
        )
        accommodations = @(
            @{
                name = "Smoke Hotel"
                checkIn = "2026-06-01"
                checkOut = "2026-06-03"
                pricePerNight = 500000
                totalPrice = 1000000
                bookingType = "nightly"
                duration = 2
                dayIds = @()
            }
        )
    }
    Assert-True ($updatedTrip.days.Count -eq 1) "Nested day update failed."
    Assert-True ($updatedTrip.days[0].activities.Count -eq 1) "Nested activity update failed."
    Assert-True ($updatedTrip.accommodations.Count -eq 1) "Accommodation update failed."

    Write-Step "Read/list/share/rate trip"
    $readTrip = Invoke-Json -Method "GET" -Uri "$ApiBaseUrl/itineraries/$tripId" -Headers $headers
    Assert-True ($readTrip.id -eq $tripId) "Owner get trip failed."

    $listTrips = Invoke-Json -Method "GET" -Uri "$ApiBaseUrl/itineraries" -Headers $headers
    Assert-True ($listTrips.total -ge 1) "List trips returned no data."

    $share = Invoke-Json -Method "POST" -Uri "$ApiBaseUrl/itineraries/$tripId/share" -Headers $headers
    Assert-True ($share.shareToken.Length -gt 10) "Share did not return token."

    $sharedTrip = Invoke-Json -Method "GET" -Uri "$ApiBaseUrl/shared/$($share.shareToken)"
    Assert-True ($sharedTrip.id -eq $tripId) "Shared trip read failed."

    $rating = Invoke-Json -Method "PUT" -Uri "$ApiBaseUrl/itineraries/$tripId/rating?rating=5" -Headers $headers
    Assert-True ($rating.success -eq $true) "Rating did not return success."

    Write-Step "Guest trip claim flow"
    $guestTrip = Invoke-Json -Method "POST" -Uri "$ApiBaseUrl/itineraries" -Body @{
        destination = "Đà Nẵng"
        tripName = "Guest Smoke $stamp"
        startDate = "2026-07-01"
        endDate = "2026-07-03"
        budget = 4000000
        adultsCount = 1
        childrenCount = 0
        interests = @("beach")
    }
    Assert-True ($guestTrip.claimToken.Length -gt 10) "Guest trip did not return claimToken."

    $claim = Invoke-Json -Method "POST" -Uri "$ApiBaseUrl/itineraries/$($guestTrip.id)/claim" -Headers $headers -Body @{
        claimToken = $guestTrip.claimToken
    }
    Assert-True ($claim.claimed -eq $true) "Claim did not return claimed=true."

    Write-Step "Places public endpoints"
    $destinationsResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/places/destinations" -UseBasicParsing
    Assert-True ($destinationsResponse.StatusCode -eq 200) "Destinations endpoint failed."

    $placesResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/places/search?limit=5" -UseBasicParsing
    Assert-True ($placesResponse.StatusCode -eq 200) "Places search endpoint failed."

    Write-Step "Frontend HTTP smoke"
    $frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
    Assert-True ($frontend.StatusCode -eq 200) "Frontend did not return HTTP 200."
    Assert-True ($frontend.Content.Contains('id="root"')) "Frontend root div was not found."

    Write-Host ""
    Write-Host "Full-stack smoke passed." -ForegroundColor Green
}
finally {
    $env:CI = $oldCi
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force
    }
}
