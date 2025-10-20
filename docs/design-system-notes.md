# Design System Notes — Accessibility Checklist

## Daily Routine View

- **Contrast tokens:**
  - `--muted-foreground` updated to `#475569` (light) and `#d1d5f0` (dark) to keep a 4.5:1 ratio against background tokens.
  - `--border` / `--input` elevated to `#d1d5db` (light) and `#4b5563` (dark) for clearer delineation of filter fields and task cards.
- **Interactive headers:** Column sort controls expose `aria-sort`, `aria-pressed`, and descriptive `aria-label`s so assistive tech reports current ordering and the next action.
- **Status messaging:** Loading/error/total summaries now live in a polite region (`aria-live="polite" aria-atomic="true"`) to announce updates without disrupting context.
- **Virtualized grid semantics:** Task rows announce as a `role="grid"` with `row`/`cell` semantics to keep keyboard navigation and screen reader modes consistent despite virtualization.
- **Modal focus management:** The conflict resolution modal traps tab order, restores focus on close, and supports `Escape` to exit while exposing `aria-labelledby`/`aria-describedby` for coherent announcements.

Include these checks when adding new routine interactions:

1. Validate contrast for any new token or background (≥ 4.5:1 for body text, ≥ 3:1 for UI affordances).
2. Confirm virtualized/async regions provide programmatic names and polite announcements for data updates.
3. Test modals and trays with keyboard-only navigation to ensure focus trapping and escape handling remain intact.
4. Re-run `pnpm lint src/components/tasks/task-list.tsx src/components/planner/conflict-modal.tsx` to keep jsx-a11y coverage on the routine grid and modal when shipping UI changes.
