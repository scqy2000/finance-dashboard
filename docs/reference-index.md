# Reference Index

## App shell and navigation

- `reference/finance-dashboard-src/App.tsx`
- `reference/finance-dashboard-src/components/Sidebar.tsx`
- `reference/finance-dashboard-src/components/ui/FeedbackProvider.tsx`

Use these when extracting layout, navigation rhythm, and user feedback patterns.

## Frontend API and store flow

- `reference/finance-dashboard-src/api/db.ts`
- `reference/finance-dashboard-src/api/types.ts`
- `reference/finance-dashboard-src/store/useStore.ts`
- `reference/finance-dashboard-src/hooks/useTransactions.ts`
- `reference/finance-dashboard-src/hooks/useAccounts.ts`

Use these when studying how the original app coordinated `invoke`, normalization, and data refresh.

## Transaction-heavy list workflows

- `reference/finance-dashboard-src/pages/Transactions.tsx`
- `reference/finance-dashboard-src/components/TransactionEditModal.tsx`
- `reference/finance-dashboard-src/components/transactions/ActionMenu.tsx`

Use these when you need a denser CRUD page than template core keeps.

## CSV import and parsing

- `reference/finance-dashboard-src/components/CsvImportModal.tsx`
- `reference/finance-dashboard-src/components/csv/parser.ts`

Use these for import preview, validation, and failure export patterns.

## Account and category management

- `reference/finance-dashboard-src/pages/Accounts.tsx`
- `reference/finance-dashboard-src/components/AccountModal.tsx`
- `reference/finance-dashboard-src/components/CategoryManager.tsx`

Use these when a project needs auxiliary entity maintenance pages.

## Analytics and dashboard composition

- `reference/finance-dashboard-src/pages/Dashboard.tsx`
- `reference/finance-dashboard-src/pages/Analytics.tsx`

Use these for multi-panel summary pages and higher-density KPI layouts.

## Settings and AI integration

- `reference/finance-dashboard-src/pages/Settings.tsx`
- `reference/finance-dashboard-src/api/ai.ts`

Use these when studying settings UX, provider prompts, and chat-oriented flows.

## Rust command orchestration

- `reference/finance-dashboard-src-tauri/commands.rs`
- `reference/finance-dashboard-src-tauri/db.rs`
- `reference/finance-dashboard-src-tauri/lib.rs`

Use these for cross-table transactions, migration history, and the previous monolithic command style.

## Utilities

- `reference/finance-dashboard-src/utils/datetime.ts`
- `reference/finance-dashboard-src/utils/errors.ts`
- `reference/finance-dashboard-src/utils/formatters.ts`

Use these when the target app needs the old helper behavior rather than the template defaults.
