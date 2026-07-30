# Build and open the Oracle FY27 all-hands preview (always fresh - restarts server on port 8825).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$sessionId = "oracle-fy27"
$port = 8825
$previewFile = Join-Path $PSScriptRoot "data\sessions\$sessionId\preview.html"
$url = "http://127.0.0.1:$port"

function Stop-PortListener([int]$TargetPort) {
  $matches = netstat -ano | Select-String "LISTENING" | Select-String ":$TargetPort\s"
  foreach ($line in $matches) {
    $parts = ($line.ToString().Trim() -replace '\s+', ' ') -split ' '
    $procId = $parts[-1]
    if ($procId -match '^\d+$' -and [int]$procId -gt 0) {
      Write-Host "Stopping old process on port $TargetPort (PID $procId)..." -ForegroundColor Yellow
      Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Milliseconds 400
}

Write-Host "Building preview..." -ForegroundColor Cyan
node generator/write-preview.mjs $sessionId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Stop-PortListener $port

Write-Host "Starting preview server on port $port..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList @(
  "generator/preview-server.mjs", $sessionId, "$port", "--open"
) -WorkingDirectory $PSScriptRoot -WindowStyle Normal

Start-Sleep -Seconds 3

try {
  $r = Invoke-WebRequest -Uri "$url/reload" -UseBasicParsing -TimeoutSec 60
  $info = $r.Content | ConvertFrom-Json
  if ($info.ok) {
    Write-Host "Preview ready (built $($info.builtAt))" -ForegroundColor Green
  }
} catch {
  Write-Host "Server starting - open $url manually if browser did not open." -ForegroundColor Yellow
}

Start-Process "cmd.exe" -ArgumentList @("/c", "start", "", "$url?v=$(Get-Date -Format 'yyyyMMddHHmmss')")

Write-Host ""
Write-Host "PREVIEW URL: $url" -ForegroundColor Green
Write-Host "Keep the node preview-server window open." -ForegroundColor Yellow
Write-Host "After edits, run this script again OR:" -ForegroundColor Cyan
Write-Host "  node generator/write-preview.mjs $sessionId" -ForegroundColor White
Write-Host "  then refresh the browser (F5)" -ForegroundColor White
Write-Host ""
Write-Host "Offline file:" -ForegroundColor Cyan
Write-Host $previewFile
