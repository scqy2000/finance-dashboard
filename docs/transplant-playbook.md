# Transplant Playbook

## Goal

Use this repository as a source template for a new local-first desktop app without carrying over finance-specific decisions.

## Fast path

### 0. Keep the runtime small

Do not start by adding features.

Start from these stable areas:

- `src/App.tsx`
- `src/store/runtime.ts`
- `src/store/useAppShellStore.ts`
- `src/modules/template-items`
- `src-tauri/src/commands`
- `src-tauri/src/repositories`
- `src-tauri/src/db.rs`

### 1. Rename product metadata

Run:

- `pwsh ./scripts/rename-template.ps1 -AppName "Your App" -PackageName "your-app" -Identifier "com.example.yourapp" -DryRun`

Then run it again without `-DryRun`.

It updates:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src/utils/preferences.ts`
- `README.md`

### 2. Replace the example entity

Frontend:

- update `src/api/types.ts`
- update `src/api/client.ts`
- copy and rename `src/modules/template-items`
- update `src/store/useTemplateItemsStore.ts`
- review `src/utils/snapshot.ts` if the new app needs backup/restore

Backend:

- replace `template_items` table in `src-tauri/src/db.rs`
- replace `src-tauri/src/repositories/items.rs`
- replace `src-tauri/src/commands/items.rs`

### 3. Keep the same boundaries until they hurt

- page files stay thin
- module components stay UI-only
- store actions coordinate refresh
- commands validate and map inputs
- repositories own SQL

### 4. Reuse the associated-entity sample before designing your own complex flow

The runtime now includes a parent-child sample:

- parent records live in `template_items`
- child records live in `template_item_steps`
- parent list queries expose aggregate counts
- child writes bump parent timestamps and refresh parent views
- snapshot export/import preserves the hierarchy

If the target app has related entities, start by cloning this sample instead of inventing a fresh mutation flow.

### 5. Reuse the batch-action sample before inventing list-side workflows

The runtime now also includes batch list operations:

- page-scoped selection state lives in the feature controller, not the global store
- batch status updates reuse the same store refresh contract as single-item writes
- batch delete runs in one backend transaction and cascades child deletes
- browser preview and Playwright tests cover the same selection contract

If the target app needs moderation, triage, or inbox-style processing, keep this pattern and swap the domain copy.

### 6. Pull advanced reference code only when needed

Use:

- `docs/reference-map.md`
- `docs/reference-index.md`

Do not import finance files directly into runtime core. Copy patterns, not names.

## Default acceptance checklist

- app starts
- browser preview opens with example data
- theme changes persist
- one record can be created, edited, deleted
- one child record can be created and the parent aggregate updates
- selected records can be batch-updated and batch-deleted
- CSV import/export works for the example entity
- snapshot export/import restores data and appearance
- pagination still works
- `npm run build:fe` passes
- `cargo test --manifest-path src-tauri/Cargo.toml` passes
- `npm run test:e2e` passes

## Common failure modes

- copying reference UI before replacing finance copy
- mixing SQL back into Tauri command files
- letting page files grow into feature controllers
- keeping one global store after multiple domains appear
- computing parent aggregate state only in the client instead of persisting child writes correctly
- putting batch selection state into global runtime before it actually needs to be shared
- adding secret handling without a fresh threat model
