# Reference Map

## Directly reuse

- App shell: title bar, sidebar structure, page container, theme token system, feedback provider
- Frontend boundary: single Tauri invoke layer in `src/api/client.ts`
- State contract: `init()` once, `refreshAll()` after writes, module-local load/add/update/delete actions
- SQLite bootstrap: local file initialization, `PRAGMA user_version`, WAL mode, and simple seeding
- Backend structure: split command modules by domain and keep system info separate from business logic
- Associated-entity starter: parent items, child steps, aggregate counts, and transactional child writes in runtime core
- Batch-action starter: page-scoped selection, batch status update, and transactional batch delete in runtime core
- Import-rollback starter: last successful import handle plus explicit invalidation after later writes

## Reuse after adaptation

- Paginated and filterable list pages from the original finance UI
- CSV import/export workflows from `reference/finance-dashboard-src/components/CsvImportModal.tsx`
- Cross-table transaction logic from `reference/finance-dashboard-src-tauri/commands.rs`
- AI context assembly and chat workflows from the finance reference frontend

The template runtime now includes a generic CSV import path, one parent-child flow, one batch-action flow, and one last-import undo flow. Treat them as starter implementations, not finished frameworks.

## Do not reuse blindly

- Finance domain names, schema, seed data, and UI copy
- Any local secret storage approach as a general-purpose security solution
- Monolithic command files that mix CRUD, analytics, settings, and AI logic in one module
- Derived state updates that trust client-provided historical data

## Suggested onboarding order

1. Confirm the shell, theme, feedback, and settings pages still match the new app direction.
2. Replace the example item schema and commands with the real domain model.
3. Keep one list page, one parent-child flow, one batch-action flow, one import-rollback flow, and one form page working before adding optional modules.
4. Add CSV import, AI, or other advanced modules only after the domain and data lifecycle are stable.
5. Remove unused reference material once the team no longer needs it.

## Reference source folders

- `reference/finance-dashboard-src`
- `reference/finance-dashboard-src-tauri`
