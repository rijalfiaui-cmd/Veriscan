# AbsenQR - Windows PowerShell Quick Tunnel Starter
# Run from the project root: powershell -ExecutionPolicy Bypass -File .\start-tunnel.ps1
# Requires: Node.js/npm, PostgreSQL, cloudflared, and installed project dependencies.

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$BackendPort = 3000
$FrontendPort = 5173
$StartedProcesses = New-Object System.Collections.Generic.List[System.Diagnostics.Process]
$TunnelLog = Join-Path $env:TEMP ("absenqr-cloudflared-{0}.log" -f [guid]::NewGuid().ToString('N'))
$TunnelErr = Join-Path $env:TEMP ("absenqr-cloudflared-{0}.err" -f [guid]::NewGuid().ToString('N'))

function Test-TcpPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(700)) { return $false }
        $client.EndConnect($result)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

function Test-HttpReady([string]$Url) {
    try {
        # Any HTTP response indicates a responding server, including auth failures.
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return ($null -ne $response)
    } catch {
        if ($_.Exception.Response) { return $true }
        return $false
    }
}

function Wait-Http([string]$Url, [int]$Seconds) {
    for ($i = 0; $i -lt $Seconds; $i++) {
        if (Test-HttpReady $Url) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Start-Managed([string]$Exe, [string]$Arguments, [string]$Directory, [string]$Label) {
    Write-Host "Starting $Label..."
    $p = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Directory -PassThru -NoNewWindow
    $StartedProcesses.Add($p)
    return $p
}

function Stop-Managed {
    Write-Host "`nStopping processes started by this launcher..."
    # Windows npm/cmd wrappers may spawn children; terminate only their process trees.
    for ($i = $StartedProcesses.Count - 1; $i -ge 0; $i--) {
        $p = $StartedProcesses[$i]
        if (-not $p.HasExited) {
            & taskkill.exe /PID $p.Id /T /F 2>$null | Out-Null
        }
    }
    Remove-Item -LiteralPath $TunnelLog, $TunnelErr -Force -ErrorAction SilentlyContinue
}

Write-Host "`n=== AbsenQR - Windows HTTPS Quick Tunnel ===`n"
if (-not (Test-Path (Join-Path $BackendDir 'package.json')) -or -not (Test-Path (Join-Path $FrontendDir 'package.json'))) {
    throw 'Place this script in the project root, alongside backend and frontend folders.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm not found. Install Node.js and restart PowerShell.' }
if (-not (Get-Command cloudflared.exe -ErrorAction SilentlyContinue)) {
    throw 'cloudflared not found. Install it with: winget install --id Cloudflare.cloudflared -e ; then restart PowerShell.'
}
if (-not (Test-Path (Join-Path $BackendDir '.env'))) { throw 'backend\.env missing. Copy .env.example to .env and configure DATABASE_URL.' }
if (-not (Test-Path (Join-Path $BackendDir 'node_modules'))) { throw 'Backend dependencies missing. Run npm install in backend first.' }
if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) { throw 'Frontend dependencies missing. Run npm install in frontend first.' }

if (-not (Test-TcpPort 5432)) {
    $pgServices = @(Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue)
    $pgService = $pgServices | Where-Object { $_.Status -eq 'Stopped' } | Select-Object -First 1
    if ($pgService) {
        Write-Host "Attempting to start PostgreSQL service $($pgService.Name)..."
        try { Start-Service -Name $pgService.Name -ErrorAction Stop } catch {
            throw "Cannot start PostgreSQL service automatically. Start it in Windows Services (administrator permission may be required). $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 3
    }
}
if (-not (Test-TcpPort 5432)) { throw 'PostgreSQL is not listening on localhost:5432. Start your database before continuing.' }
Write-Host 'PostgreSQL port 5432 is reachable.'

try {
    $healthUrl = "http://127.0.0.1:$BackendPort/api/v1/health"
    if (Test-TcpPort $BackendPort) {
        if (-not (Test-HttpReady $healthUrl)) { throw "Port $BackendPort is occupied, but the AbsenQR health endpoint is unavailable." }
        Write-Host "Using existing backend at $healthUrl"
    } else {
        $null = Start-Managed 'npm.cmd' 'run start:dev' $BackendDir 'NestJS backend'
        if (-not (Wait-Http $healthUrl 45)) { throw "Backend did not become ready at $healthUrl. Check errors above." }
        Write-Host "Backend ready: $healthUrl"
    }

    $frontendUrl = "http://127.0.0.1:$FrontendPort/"
    if (Test-TcpPort $FrontendPort) {
        if (-not (Test-HttpReady $frontendUrl)) { throw "Port $FrontendPort is occupied by a nonresponding service." }
        Write-Host "Using existing frontend at $frontendUrl"
    } else {
        $null = Start-Managed 'npm.cmd' 'run dev -- --host 127.0.0.1 --strictPort' $FrontendDir 'Vite frontend'
        if (-not (Wait-Http $frontendUrl 35)) { throw "Frontend did not become ready at $frontendUrl. Check errors above." }
        Write-Host "Frontend ready: $frontendUrl"
    }

    Write-Host "`nOpening Cloudflare Quick Tunnel..."
    $tunnel = Start-Process -FilePath 'cloudflared.exe' -ArgumentList @('tunnel','--url',"http://127.0.0.1:$FrontendPort") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $TunnelLog -RedirectStandardError $TunnelErr -PassThru -NoNewWindow
    $StartedProcesses.Add($tunnel)
    $tunnelUrl = $null
    for ($i = 0; $i -lt 45; $i++) {
        $content = ((Get-Content $TunnelLog -Raw -ErrorAction SilentlyContinue) + "`n" + (Get-Content $TunnelErr -Raw -ErrorAction SilentlyContinue))
        $match = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $tunnelUrl = $match.Value; break }
        if ($tunnel.HasExited) { break }
        Start-Sleep -Seconds 1
    }
    if (-not $tunnelUrl) { throw "Tunnel URL not found. Inspect cloudflared output above or logs at $TunnelErr" }
    Write-Host "`n============================================"
    Write-Host "AbsenQR HTTPS URL: $tunnelUrl"
    Write-Host 'Open this URL on your Android phone.'
    Write-Host 'Browser camera permission is still required.'
    Write-Host 'Keep this window open; press Ctrl+C to stop.'
    Write-Host '============================================'
    Write-Warning 'Confirm vite.config proxy routes /api and /uploads to http://localhost:3000 and that Vite allows the tunnel hostname.'
    Write-Warning 'Quick Tunnel is public. Use test data and secure credentials.'
    while (-not $tunnel.HasExited) { Start-Sleep -Seconds 1 }
    Write-Warning 'Cloudflare tunnel exited.'
} finally {
    Stop-Managed
}
