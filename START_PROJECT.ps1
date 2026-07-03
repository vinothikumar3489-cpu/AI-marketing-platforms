# Start AI Marketing Platform
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Marketing Platform Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$frontendPath = "$PSScriptRoot\frontend"
$backendPath = "$PSScriptRoot\backend"

# Check if backend is already running on port 5000
$backendRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "[OK] Backend already running on port 5000" -ForegroundColor Green
} else {
    Write-Host "[>] Starting Backend Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server' -ForegroundColor Green; npm run dev"
    Start-Sleep -Seconds 3
}

Write-Host "[>] Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server' -ForegroundColor Green; npm run dev"
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open Chrome
Write-Host "[>] Opening Chrome..." -ForegroundColor Yellow
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeFound = $false
foreach ($chromePath in $chromePaths) {
    if (Test-Path $chromePath) {
        Start-Process $chromePath -ArgumentList "http://localhost:8080"
        $chromeFound = $true
        break
    }
}

if (-not $chromeFound) {
    Write-Host "[!] Chrome not found. Opening default browser..." -ForegroundColor Yellow
    Start-Process "http://localhost:8080"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
