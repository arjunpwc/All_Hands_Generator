# Push All Hands Generator to GitHub
# Repo: https://github.com/arjunpwc/All_Hands_Generator

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location $PSScriptRoot

Write-Host "Remote:" -ForegroundColor Cyan
git remote -v

Write-Host "`nPushing to main..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccess! View at: https://github.com/arjunpwc/All_Hands_Generator" -ForegroundColor Green
} else {
    Write-Host "`nPush failed. Common fixes:" -ForegroundColor Yellow
    Write-Host "  1. Sign in when Git Credential Manager prompts for GitHub"
    Write-Host "  2. Use a Personal Access Token as your password (GitHub Settings > Developer settings > PAT)"
    Write-Host "  3. If on PwC network, try personal hotspot or VPN — corporate firewalls may block git push"
}
