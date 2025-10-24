# PR and Deployment Checklist

This checklist now powers the required PR template at `.github/pull_request_template.md`. Fill out every
section before merging to `main`, and review it again as part of your release prep. Three items are
blocking gates enforced by GitHub status checks:

1. **Build** – `pnpm build` must pass (runs in CI).
2. **Smoke tests** – `pnpm test:smoke` exercises `/dashboard`, `/journal`, and `/planner`.
3. **Environment variables review** – a manual approval step tied to the `release-gates` environment.

If any of these gates fail or remain unchecked, the PR cannot merge without fixing the failure or receiving
explicit approval on the environment review.

## 1) Branch & PR hygiene
- [ ] Feature branch named clearly (e.g., `feat/…`, `fix/…`, `chore/…`).
- [ ] PR title is scoped and imperative (e.g., `feat(ui): …`).
- [ ] PR description summarizes changes and links issues.
- [ ] Screenshots or short clips for UI changes.

## 2) Local quality gates
- [ ] `pnpm install --frozen-lockfile`.
- [ ] `pnpm lint`.
- [ ] `pnpm typecheck`.
- [ ] `pnpm build` (rerun locally if CI fails; see README for Google Fonts workaround when offline).
- [ ] Confirm no debug logs or secrets remain (`git diff`).

## 3) Environment variables
Configure values in both your local `.env.local` (never committed) and your hosting provider (e.g., Vercel):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` (from your Supabase project).
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from your Supabase project).
- [ ] `OPENAI_API_KEY` (optional, enables AI summaries).
- [ ] `NEXT_PUBLIC_SITE_URL` (e.g., `https://your-app.vercel.app`).

When opening a PR, request approval on the **Environment variables review** job in CI. Configure the
`release-gates` environment in GitHub with the appropriate approvers so the job cannot start without manual
confirmation that the production variables are up to date.

## 4) Supabase setup
- [ ] Apply schema: run `supabase/sql/initial_schema.sql` in the SQL Editor.
- [ ] Confirm RLS policies are enabled (they are included in the SQL file).
- [ ] Auth Redirect URLs (Authentication → URL Configuration):
  - `http://localhost:3000/auth/callback`.
  - `https://YOUR-VERCEL-DOMAIN/auth/callback`.

## 5) Vercel setup
- [ ] Project created/linked to the GitHub repo.
- [ ] Environment variables set (see Section 3).
- [ ] Install command: `pnpm install --frozen-lockfile`.
- [ ] Build command: `pnpm build`.
- [ ] Node version 20+ (Vercel defaults are sufficient).
- [ ] `NEXT_PUBLIC_SITE_URL` matches the production URL.

## 6) Continuous integration
- [ ] GitHub Actions workflow at `.github/workflows/ci.yml` is green on the PR.
- [ ] Add repository secrets/variables only if a new CI step requires them.

## 7) Post‑deploy smoke test
- [x] Landing page renders.
- [ ] Auth flow: request magic link and sign in.
- [ ] Journals: create, list, summarize, delete.
- [ ] Connections: add, search, delete.
- [ ] Settings: load and save.
- [ ] APIs return 200/appropriate codes under auth.

## 8) Merge & cleanup
- [ ] Merge via PR (no direct pushes to `main`).
- [ ] Delete merged branches (ensure the default branch isn’t the feature branch).
- [ ] Tag a release if needed (e.g., `v0.1.0`).

## 9) Weekly release review
Every Monday the scheduled workflow `.github/workflows/weekly-release-review.yml` opens an issue to revisit
the last week of deployments. Use it to:

1. Walk through this checklist for each deployment to production.
2. Confirm the Build, Smoke tests, and Environment variables gates all completed.
3. Plan a rollback or hotfix for any release that skipped a mandatory gate.

Close the issue only after documenting outcomes and linking follow-up work (bug tickets, rollbacks, or
postmortems as needed).
