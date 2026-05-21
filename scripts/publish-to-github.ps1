# Publish photobooth to a new GitHub repository.
# Prerequisites: git, GitHub CLI (gh), and `gh auth login`
#
# Usage:
#   cd C:\Users\dan25\projects\photobooth
#   .\scripts\publish-to-github.ps1
#   .\scripts\publish-to-github.ps1 -RepoName "my-photobooth" -Private

param(
  [string]$RepoName = "photobooth",
  [switch]$Private
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or not on PATH. Install from https://git-scm.com/download/win"
}

if (-not (Test-Path .git)) {
  Write-Host "==> git init"
  git init
  # Prefer main as default branch (Git 2.28+)
  git branch -M main 2>$null
}

Write-Host "==> Checking for secret files that must not be committed..."
$trackedEnv = @()
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
try {
  $trackedEnv = git ls-files 2>$null | Where-Object { $_ -match '\.env$' -and $_ -notmatch '\.env\.example$' }
} finally {
  $ErrorActionPreference = $prevEap
}
if ($trackedEnv) {
  throw "Refusing to continue: .env files are tracked: $($trackedEnv -join ', ')"
}
foreach ($p in @(".env", "packages/db/.env")) {
  if (Test-Path $p) {
    Write-Host "    OK: $p exists locally and is gitignored"
  }
}

Write-Host "==> Staging files"
git add -A
git status

if (-not (git rev-parse HEAD 2>$null)) {
  Write-Host "==> Initial commit"
  git commit -m "Initial commit: AI photobooth platform monorepo"
} else {
  $dirty = git status --porcelain
  if ($dirty) {
    Write-Host "==> Committing pending changes"
    git commit -m "Prepare repository for GitHub publish"
  }
}

Write-Host "==> GitHub CLI auth"
gh auth status

$visibility = if ($Private) { "--private" } else { "--public" }
$desc = "Multi-tenant AI photobooth platform (kiosk, admin, API, worker)"

if (git remote get-url origin 2>$null) {
  Write-Host "==> Remote 'origin' already exists:"
  git remote -v
  Write-Host "==> Pushing current branch"
  git push -u origin HEAD
} else {
  Write-Host "==> Creating GitHub repo: $RepoName ($visibility)"
  try {
    gh repo create $RepoName --source=. $visibility --description $desc --push
  } catch {
    Write-Host "Repo name may be taken. Retrying as ai-photobooth..."
    gh repo create ai-photobooth --source=. $visibility --description $desc --push
  }
}

$url = gh repo view --json url -q .url
Write-Host ""
Write-Host "Done. Repository: $url"
Write-Host "Branch: $(git branch --show-current)"
