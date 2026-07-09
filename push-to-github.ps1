# Push All Hands Generator to GitHub via SSH (works on PwC network)
# Repo: https://github.com/arjunpwc/All_Hands_Generator

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location $PSScriptRoot

$keyPath = "$env:USERPROFILE\.ssh\id_ed25519"
$pubPath = "$keyPath.pub"

if (-not (Test-Path $pubPath)) {
    Write-Host "Generating SSH key..." -ForegroundColor Cyan
    if (-not (Test-Path "$env:USERPROFILE\.ssh")) { New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" | Out-Null }
    ssh-keygen -t ed25519 -N '""' -f $keyPath -q
}

$pubKey = (Get-Content $pubPath -Raw).Trim()
Write-Host "`nYour SSH public key:" -ForegroundColor Cyan
Write-Host $pubKey -ForegroundColor White
Write-Host ""

# Ensure SSH config uses port 443 (bypasses PwC HTTPS git block)
$sshConfig = "$env:USERPROFILE\.ssh\config"
if (-not (Test-Path $sshConfig) -or -not (Select-String -Path $sshConfig -Pattern "ssh.github.com" -Quiet)) {
    @"
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
"@ | Add-Content $sshConfig
}

git remote set-url origin git@github.com:arjunpwc/All_Hands_Generator.git

Write-Host "Testing GitHub SSH connection..." -ForegroundColor Cyan
$test = ssh -T git@github.com 2>&1 | Out-String

if ($test -match "successfully authenticated|Hi arjunpwc") {
    Write-Host "SSH authenticated!" -ForegroundColor Green
} else {
    Write-Host "SSH key not yet added to GitHub." -ForegroundColor Yellow
    Write-Host "Opening GitHub to add your key — click 'Add SSH key' and confirm.`n" -ForegroundColor Yellow

    $encodedKey = [uri]::EscapeDataString($pubKey)
    $url = "https://github.com/settings/ssh/new?title=PwC-Laptop&key=$encodedKey"
    Start-Process $url

    Write-Host "After adding the key on GitHub, run this script again:" -ForegroundColor Cyan
    Write-Host "  .\push-to-github.ps1`n"
    exit 1
}

Write-Host "Pushing to main..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccess! https://github.com/arjunpwc/All_Hands_Generator" -ForegroundColor Green
} else {
    Write-Host "`nPush failed. Run: git push -u origin main" -ForegroundColor Red
    exit 1
}
