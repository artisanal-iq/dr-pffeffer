# Power Practice Planner

A Next.js 15 (App Router) workspace for the Power Practice Planner MVP. The app helps ambitious professionals cultivate
presence, purpose, and productivity through daily power routines, influence journals, and lightweight relationship tracking.
This repository already includes Supabase/Drizzle scaffolding, API route handlers, and React Query hooks that will power the
full experience.

## Documentation

- [Product Requirements Document](docs/prd.md)
- [Technical Specification](docs/technical-spec.md)
- [PR & Deployment Checklist](docs/PR_DEPLOY_CHECKLIST.md)
- [Environment Setup Guide](docs/environment-setup.md)
- [Observability Playbook](docs/observability-playbook.md)

## Tech Stack

- **Framework:** Next.js 15 with the App Router and React Server Components
- **Language:** TypeScript + ESLint (flat config)
- **UI:** Tailwind CSS 4 with shadcn/ui primitives (coming soon)
- **State & Data Fetching:** React Query and Zustand
- **Backend:** Supabase (Postgres, Auth, RLS) accessed through route handlers
- **ORM / Schema:** Drizzle ORM with SQL migrations stored in `supabase/sql`
- **AI:** Vercel AI SDK stubs for summaries and focus prompts

## Status Snapshot

- ✅ Route handlers for journals, tasks, power practices, connections, and settings exist under `src/app/api`.
- ✅ Supabase client helpers are available for server and browser contexts (`src/lib/supabase-*.ts`).
- ✅ Drizzle models mirror the SQL schema used to bootstrap Supabase.
- ✅ Journal feature has a functional React Query-based client with create/delete/summarize actions.
- ⚠️ Authentication UI, AI integrations, and dashboards are still placeholders pending design.

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 8+
- Supabase project with the SQL schema from `supabase/sql/initial_schema.sql`

### Installation & Local Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development server runs on [http://localhost:3000](http://localhost:3000). Routes for `/dashboard`, `/planner`, `/journal`,
`/connections`, and `/settings` already render scaffolded pages.

### Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm build    # requires outbound network access to download Google Fonts
```

> **Note:** In restricted environments the production build may fail while downloading the Geist font files. Set
> `NEXT_FONT_GOOGLE_FETCH_TIMEOUT=60000` or allow outbound access if you encounter this during CI/CD runs.

### Environment Variables

Create a `.env.local` (not committed) and configure the following values locally and on Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-key"
OPENAI_API_KEY="optional-key"
NEXT_PUBLIC_SITE_URL="http://localhost:3000" # update in production
LOGFLARE_SOURCE_TOKEN="logflare-source-token"
LOGFLARE_API_KEY="logflare-api-key"
LOGFLARE_API_URL="https://api.logflare.app/logs" # optional override per-environment
```

Additional server-side keys (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`) are only required for migrations or background
jobs.

### Database & Migrations

- Run the bootstrap SQL in `supabase/sql/initial_schema.sql` through the Supabase SQL editor to create tables, indexes, RLS, and
  triggers.
- Drizzle schema definitions live in `src/db/schema.ts`; generate migrations with `pnpm dlx drizzle-kit generate` as the schema
  evolves.

### Project Structure

```
├── docs/                     # PRD, technical spec, deployment checklist
├── src/app/                  # App Router pages and route handlers
│   ├── api/                  # REST-like handlers backed by Supabase
│   ├── journal/              # Journal UI (client component)
│   ├── dashboard|planner|…   # Placeholder pages for upcoming features
│   └── providers.tsx         # React Query + Theme providers
├── src/hooks/                # React Query hooks grouped by domain
├── src/lib/                  # Supabase clients and fetch helpers
├── src/db/schema.ts          # Drizzle ORM table definitions
└── supabase/sql/             # SQL migrations for Supabase
```

### Linting & Formatting

The repository uses ESLint with the Next.js config. Tailwind CSS v4 handles styling; Prettier is not included, so rely on the
editor's TypeScript/ESLint integrations for formatting feedback.

### Deployment Notes

- GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies with pnpm, lints, typechecks, and builds.
- On Vercel, set install command to `pnpm install --frozen-lockfile` and build command to `pnpm build`.
- Ensure the Supabase redirect URLs include `http://localhost:3000/auth/callback` and your Vercel domain before enabling magic
  link authentication.
