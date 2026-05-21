# Publish to GitHub

One-time setup to push this project to a new GitHub repository.

## Prerequisites

1. **Git** — [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. **GitHub CLI** — [https://cli.github.com/](https://cli.github.com/)
3. Log in: `gh auth login`

## Quick publish (recommended)

From PowerShell:

```powershell
cd C:\Users\dan25\projects\photobooth
.\scripts\publish-to-github.ps1
```

Optional flags:

```powershell
.\scripts\publish-to-github.ps1 -RepoName "my-photobooth"
.\scripts\publish-to-github.ps1 -Private
```

The script will:

- Refuse to run if `.env` files would be committed
- `git init` (if needed)
- Create an initial commit (if needed)
- Create `github.com/<you>/photobooth` (or `ai-photobooth` if the name is taken)
- Push `main` / current branch

## Manual steps

```powershell
cd C:\Users\dan25\projects\photobooth
git init
git add -A
git status   # confirm .env is NOT listed
git commit -m "Initial commit: AI photobooth platform monorepo"
gh repo create photobooth --source=. --public --description "Multi-tenant AI photobooth platform (kiosk, admin, API, worker)" --push
```

## Security checklist

Before pushing, ensure these are **not** committed (they are in `.gitignore`):

- `.env`
- `packages/db/.env`
- `apps/api/uploads/` (local photos)
- API keys (Gemini, SumUp, etc.)

Only `.env.example` should be in the repo.

## After publish

- Add repository secrets in GitHub for CI/deploy (see `docs/DEPLOY.md`)
- Rotate any API keys that were ever shared outside the repo
