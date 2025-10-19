# Environment Setup Guide

This guide explains how to configure local development and cloud environments for the Power Practice Planner. It covers Supabase, Vercel, and logging endpoints so the team can move from a fresh clone to a production-ready deployment.

## 1. Supabase

### 1.1 Create the project

1. Sign in to [Supabase](https://supabase.com/).
2. Create a new project in the "Power Practice Planner" organization/workspace (or the appropriate shared workspace).
3. Choose the **Free** tier for non-production environments; use **Pro** or higher for production workloads.
4. Set the database password and record it in the team password manager.

### 1.2 Apply the schema

1. From the Supabase dashboard, open **SQL Editor**.
2. Upload and run `supabase/sql/initial_schema.sql` from this repo.
3. Confirm the tables and RLS policies were created successfully in the table view.

### 1.3 Configure authentication

1. Navigate to **Authentication → URL Configuration**.
2. Add the following redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
3. If email magic links are enabled, configure the SMTP sender (SES, Resend, etc.) in the **Authentication → Providers** section.

### 1.4 Retrieve API keys

Collect the following values from **Project Settings → API**:

| Variable | Source | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Must include the full `https://` prefix. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key | Used by the browser and server components. |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | Required only for admin scripts and database migrations. Store securely. |
| `SUPABASE_DB_URL` | Connection string | Use the `psql` connection string for Drizzle migrations. |

Store the keys in 1Password/Bitwarden and never commit them to Git.

## 2. Vercel

### 2.1 Project linking

1. Create or open the Vercel project bound to this repository.
2. Under **Settings → Git**, confirm the repo is connected and the production branch matches the desired deployment branch.

### 2.2 Environment variables

Populate the variables from `.env.example` in **Settings → Environment Variables** for each environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `OPENAI_API_KEY` (optional; required for AI summaries)
- `SUPABASE_SERVICE_ROLE_KEY` (staging/production only)
- `SUPABASE_DB_URL` (deploy hooks or migration runners)
- Logging endpoints described below

Redeploy the project after adding variables to ensure they are available to the runtime.

### 2.3 Build & deploy settings

- **Install Command:** `pnpm install --frozen-lockfile`
- **Build Command:** `pnpm build`
- **Output Directory:** default (handled by Next.js)
- Configure a [Production Branch Protection](https://vercel.com/docs/workflows/git/protecting-your-production-branch) rule so only approved PRs deploy automatically.

## 3. Logging Endpoints

The application pushes structured logs to an external collector (e.g., Axiom, Logflare, Datadog). Configure one endpoint per environment and expose it through environment variables:

| Variable | Description |
| --- | --- |
| `LOG_INGEST_URL` | HTTPS endpoint that accepts JSON log batches. |
| `LOG_INGEST_TOKEN` | Bearer/API token with permission to write logs. |
| `LOG_ENVIRONMENT` | Free-form environment label (e.g., `local`, `preview`, `production`). |

**Local development:** point `LOG_INGEST_URL` to a mock service such as [`https://webhook.site`](https://webhook.site) while iterating. For production, request dedicated endpoints from the DevOps team’s logging provider.

Expose these variables in both the Vercel dashboard and `.env.local` (for local testing). The logging middleware should read them via `process.env` and gracefully no-op if the URL or token is missing.

## 4. Local development flow

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Run `pnpm validate-env` to verify the configuration.
3. Start the dev server with `pnpm dev` and test Supabase auth flows locally.
4. Commit changes—the auto-generated Git pre-commit hook runs `pnpm validate-env` before each commit.

## 5. Review & sign-off

Before considering the environment configuration complete, schedule a walkthrough with the DevOps/engineering lead. Use the checklist below to drive the review:

- [ ] Supabase project credentials stored securely and rotated policies documented.
- [ ] Vercel environment variables match `.env.example` and secrets are scoped correctly.
- [ ] Logging endpoints verified for each environment (local/preview/production).
- [ ] `pnpm validate-env` passes on developer machines and CI runners.

Document the sign-off date and any follow-up tasks in the team’s project tracker.

