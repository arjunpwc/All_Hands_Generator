# Build and open the Oracle FY27 all-hands preview in your default browser.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building preview..." -ForegroundColor Cyan
node generator/write-preview.mjs oracle-fy27
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$sessionId = "oracle-fy27"
$previewFile = Join-Path $PSScriptRoot "data\sessions\$sessionId\preview.html"
$ports = @(8810, 8811, 8812, 8820, 8830, 8765, 8770, 8780, 8790, 8800)

function Test-PreviewServer([int]$Port) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200 -and $r.Content -match "data-built-at" -and $r.Content -match 'data-tab="pipeline"'
  } catch {
    return $false
  }
}

foreach ($port in $ports) {
  if (Test-PreviewServer $port) {
    $url = "http://127.0.0.1:$port"
    Write-Host "Preview server already running." -ForegroundColor Green
    Write-Host "Opening $url" -ForegroundColor Green
    Start-Process $url
    Write-Host ""
    Write-Host "Offline file (double-click in Explorer):" -ForegroundColor Cyan
    Write-Host $previewFile
    exit 0
  }
}

foreach ($port in $ports) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    $listener.Stop()
  } catch {
    continue
  }

  Write-Host "Starting preview server on port $port..." -ForegroundColor Cyan
  Start-Process -FilePath "node" -ArgumentList @("generator/preview-server.mjs", $sessionId, "$port", "--open") -WorkingDirectory $PSScriptRoot -WindowStyle Normal
  Start-Sleep -Seconds 2

  $url = "http://127.0.0.1:$port"
  if (Test-PreviewServer $port) {
    Write-Host "Preview ready at $url" -ForegroundColor Green
    Start-Process $url
    Write-Host ""
    Write-Host "Keep the 'node preview-server' window open while viewing." -ForegroundColor Yellow
    Write-Host "Offline file:" -ForegroundColor Cyan
    Write-Host $previewFile
    exit 0
  }
}

Write-Host "Could not start preview server. Open the offline file instead:" -ForegroundColor Yellow
Write-Host $previewFile
Start-Process $previewFile
exit 1
