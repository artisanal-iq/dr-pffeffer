 # PR and Deployment Checklist

Use this checklist before merging any PR to main and when preparing a deployment.

## 1) Branch & PR Hygiene
- [ ] Feature branch named clearly (e.g., `feat/…`, `fix/…`, `chore/…`)
- [ ] PR title is scoped and imperative (e.g., `feat(ui): …`)
- [ ] PR description summarizes changes and links issues
- [ ] Screenshots or short clips for UI changes

## 2) Quality Gates (Local)
- [ ] Install deps (frozen): `pnpm install --frozen-lockfile`
- [ ] Lint: `pnpm lint`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Build: `pnpm build`
- [ ] No debug logs or secrets in diff (`git diff`)

## 3) Environment Variables
Configure in both local `.env.local` (not committed) and hosting provider (Vercel):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` (from Supabase project)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase project)
- [ ] `OPENAI_API_KEY` (optional, enables AI summaries)
- [ ] `NEXT_PUBLIC_SITE_URL` (e.g., `https://your-app.vercel.app`)

## 4) Supabase Setup
- [ ] Apply schema: run `supabase/sql/initial_schema.sql` in SQL Editor
- [ ] RLS policies enabled (included in the SQL)
- [ ] Auth Redirect URLs (Authentication → URL Configuration):
  - `http://localhost:3000/auth/callback`
  - `https://YOUR-VERCEL-DOMAIN/auth/callback`

## 5) Vercel Setup
- [ ] Create/Link project to GitHub repo
- [ ] Set Environment Variables (see Section 3)
- [ ] Build & Install:
  - Install Command: `pnpm install --frozen-lockfile`
  - Build Command: `pnpm build`
- [ ] Node version 20+ (Vercel defaults are fine)
- [ ] Add `NEXT_PUBLIC_SITE_URL` to match the production URL

## 6) CI
- [ ] GitHub Actions (./.github/workflows/ci.yml) is green on PR
- [ ] If needed, add repo secrets (Settings → Secrets and variables):
  - Only when CI steps require them (none mandatory for current pipeline)

## 7) Post‑Deploy Smoke Test
- [ ] Landing page renders
- [ ] Auth flow: request magic link and sign in
- [ ] Journals: create, list, summarize, delete
- [ ] Connections: add, search, delete
- [ ] Settings: load and save
- [ ] APIs return 200/appropriate codes under auth

## 8) Merge & Cleanup
- [ ] Merge via PR (no direct pushes to main)
- [ ] Delete merged branches (ensure default branch isn’t the feature branch)
- [ ] Tag a release if needed (e.g., `v0.1.0`)
