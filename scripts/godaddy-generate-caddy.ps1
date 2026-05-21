# Generate deploy/Caddyfile from .env (Windows, before docker compose up)
# Usage: .\scripts\godaddy-generate-caddy.ps1

$envFile = Join-Path $PSScriptRoot ".." ".env"
$template = Join-Path $PSScriptRoot ".." "deploy" "Caddyfile.template"
$output = Join-Path $PSScriptRoot ".." "deploy" "Caddyfile"

if (-not (Test-Path $envFile)) {
  Write-Error "Missing .env — copy deploy/env.production.example to .env first."
  exit 1
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"')
    Set-Item -Path "env:$name" -Value $value
  }
}

$required = @("BOOTH_DOMAIN", "ADMIN_DOMAIN", "API_DOMAIN", "ACME_EMAIL")
foreach ($key in $required) {
  if (-not (Get-Item "env:$key" -ErrorAction SilentlyContinue)) {
    Write-Error "Set $key in .env"
    exit 1
  }
}

$content = Get-Content $template -Raw
$content = $content -replace '\{\$BOOTH_DOMAIN\}', $env:BOOTH_DOMAIN
$content = $content -replace '\{\$ADMIN_DOMAIN\}', $env:ADMIN_DOMAIN
$content = $content -replace '\{\$API_DOMAIN\}', $env:API_DOMAIN
$content = $content -replace '\{\$ACME_EMAIL\}', $env:ACME_EMAIL

Set-Content -Path $output -Value $content -NoNewline
Write-Host "Wrote $output"
