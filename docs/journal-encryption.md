# Journal Encryption Overview

Journal entries and AI summaries are encrypted before they are persisted in Supabase. Encryption and decryption happen inside the API route handlers so the browser never sees the raw key material.

## Key material (interim approach)

- The AES-GCM key is supplied via the `JOURNAL_ENCRYPTION_KEY` environment variable.
- The value must be a base64-encoded 32-byte secret (suitable for AES-256).
- Keys are imported through the Web Crypto API and cached in-memory for reuse across requests.
- Missing or malformed key material will surface as `encryption_error` responses from the journal endpoints.

## Legacy compatibility

Existing plaintext rows are still returned as-is. When decryption fails with an `OperationError`/`InvalidCharacterError`, the API falls back to the original value so we can migrate rows in-place without downtime.

## Follow-up work

- Rotate the `JOURNAL_ENCRYPTION_KEY` on a schedule and add automated re-encryption.
- Move key storage to a managed KMS (e.g. AWS KMS, GCP KMS, Vercel Secrets) instead of plain environment variables.
- Persist IV metadata alongside ciphertext to enable eventual authenticated key rotation and audit trails.
- Extend the test harness with integration coverage for the Supabase client once encrypted data is populated in staging.
