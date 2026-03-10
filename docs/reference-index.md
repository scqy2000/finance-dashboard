# Reference Index

## Recommended reading order

1. App shell and navigation
2. Frontend API and store flow
3. Transaction-heavy list workflows
4. CSV import and parsing
5. Settings and AI integration
6. Rust command orchestration

Start with the shell and data boundary first. Read dense feature flows only after the template core shape is stable.

## App shell and navigation

- `reference/finance-dashboard-src/App.tsx`
- `reference/finance-dashboard-src/components/Sidebar.tsx`
- `reference/finance-dashboard-src/components/ui/FeedbackProvider.tsx`

Use these when extracting layout, navigation rhythm, and user feedback patterns.
Risk: low. These files are mostly structural and are the safest starting point.

## Frontend API and store flow

- `reference/finance-dashboard-src/api/db.ts`
- `reference/finance-dashboard-src/api/types.ts`
- `reference/finance-dashboard-src/store/useStore.ts`
- `reference/finance-dashboard-src/hooks/useTransactions.ts`
- `reference/finance-dashboard-src/hooks/useAccounts.ts`

Use these when studying how the original app coordinated `invoke`, normalization, and data refresh.
Risk: medium. The original store is more domain-coupled than the template version and should be adapted, not copied verbatim.

## Transaction-heavy list workflows

- `reference/finance-dashboard-src/pages/Transactions.tsx`
- `reference/finance-dashboard-src/components/TransactionEditModal.tsx`
- `reference/finance-dashboard-src/components/transactions/ActionMenu.tsx`

Use these when you need a denser CRUD page than template core keeps.
Risk: high. This area carries finance-specific assumptions and heavier UI density.

## CSV import and parsing

- `reference/finance-dashboard-src/components/CsvImportModal.tsx`
- `reference/finance-dashboard-src/components/csv/parser.ts`

Use these for import preview, validation, and failure export patterns.
Risk: medium. The workflow is reusable, but field mapping and date normalization are domain-sensitive.

## Account and category management

- `reference/finance-dashboard-src/pages/Accounts.tsx`
- `reference/finance-dashboard-src/components/AccountModal.tsx`
- `reference/finance-dashboard-src/components/CategoryManager.tsx`

Use these when a project needs auxiliary entity maintenance pages.
Risk: medium. Useful for secondary entities, but naming and validation logic are domain-specific.

## Analytics and dashboard composition

- `reference/finance-dashboard-src/pages/Dashboard.tsx`
- `reference/finance-dashboard-src/pages/Analytics.tsx`

Use these for multi-panel summary pages and higher-density KPI layouts.
Risk: medium to high. Layout ideas are reusable; metrics and aggregation logic are not.

## Settings and AI integration

- `reference/finance-dashboard-src/pages/Settings.tsx`
- `reference/finance-dashboard-src/api/ai.ts`

Use these when studying settings UX, provider prompts, and chat-oriented flows.
Risk: high. Keep the UX ideas, discard the finance prompts and provider assumptions.

## Rust command orchestration

- `reference/finance-dashboard-src-tauri/commands.rs`
- `reference/finance-dashboard-src-tauri/db.rs`
- `reference/finance-dashboard-src-tauri/lib.rs`

Use these for cross-table transactions, migration history, and the previous monolithic command style.
Risk: high. Read for patterns and failure modes, not for direct reuse of structure.

## Utilities

- `reference/finance-dashboard-src/utils/datetime.ts`
- `reference/finance-dashboard-src/utils/errors.ts`
- `reference/finance-dashboard-src/utils/formatters.ts`

Use these when the target app needs the old helper behavior rather than the template defaults.
Risk: low. Helpers are reusable, but locale and formatting behavior still need review.
