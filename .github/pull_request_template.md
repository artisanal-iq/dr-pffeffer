## Summary
- [ ] Scope this change in one or two sentences.
- [ ] Link to any tracking issues or RFCs.

## Mandatory gates (blocking)
- [ ] `pnpm build` succeeded locally or in CI (status check: **Build**).
- [ ] Smoke tests for `/dashboard`, `/journal`, `/planner` passed (`pnpm test:smoke`, status check: **Smoke tests**).
- [ ] Environment variables confirmed for the target environment (status check: **Environment variables review**).

## Branch & PR hygiene
- [ ] Feature branch name is clear (e.g., `feat/...`, `fix/...`).
- [ ] PR title is scoped and imperative (e.g., `feat(ui): ...`).
- [ ] PR description summarizes changes and links issues.
- [ ] Screenshots or short clips added for UI changes.

## Quality gates (local)
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Confirm no debug logs or secrets remain (`git diff`).

## Environment variables
Confirm each variable is populated both in local `.env.local` (not committed) and your hosting provider (e.g., Vercel):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `OPENAI_API_KEY` (optional, enables AI summaries)
- [ ] `NEXT_PUBLIC_SITE_URL`

## Deployment prep
- [ ] Supabase schema applied and RLS policies verified (`supabase/sql/initial_schema.sql`).
- [ ] Vercel environment configured (install/build commands, Node 20+, `NEXT_PUBLIC_SITE_URL`).
- [ ] GitHub Actions green (`.github/workflows/ci.yml`).
- [ ] Post-deploy smoke test plan captured (landing page, auth magic link, journals, connections, settings, APIs).
- [ ] Merge via PR (no direct pushes to `main`).
- [ ] Delete merged branches and tag release if needed (e.g., `v0.1.0`).
