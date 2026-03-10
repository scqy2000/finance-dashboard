# Local First Desktop Template

A reusable local-first desktop starter extracted from the original Finance Dashboard project.

## What is in template core

- Tauri v2 desktop shell with custom title bar and sidebar navigation
- React + TypeScript + Zustand frontend with a single API entry layer
- Rust command modules split by concern instead of one monolithic file
- SQLite initialization, lightweight `user_version` migrations, WAL mode, and one seeded example entity
- Theme tokens, local appearance preferences, toast and confirm feedback primitives
- One complete CRUD example with pagination and a persisted app setting

## What is not in template core

- Finance-specific schema, copy, analytics logic, and workflows
- Secret storage patterns treated as a generic security recommendation
- AI prompt content or provider-specific operational logic
- Large, cross-domain command files

## Repository layout

- `src/`: generic runtime frontend
- `src-tauri/src/`: generic runtime backend
- `reference/finance-dashboard-src/`: original finance frontend kept as reference material
- `reference/finance-dashboard-src-tauri/`: original finance Rust backend kept as reference material
- `docs/reference-map.md`: extraction guidance for what to reuse directly and what to adapt first
- `docs/reference-index.md`: reference files grouped by theme
- `docs/template-items-module.md`: how to copy and reshape the example CRUD module

## Runtime contracts kept on purpose

- Frontend calls Tauri only through `src/api/client.ts`
- Zustand store keeps `init()` and `refreshAll()` as the default lifecycle contract
- Backend write commands run in transactions
- Backend update and delete flows read the current database record instead of trusting stale client copies
- Non-sensitive appearance preferences stay in local storage; SQLite-backed settings are explicit and opt-in

## Template pages

- `Overview`: runtime status and template intent
- `Items`: example CRUD entity with pagination
- `References`: direct reuse vs optional reference material
- `Settings`: local appearance settings plus one SQLite-backed note

## Development

```bash
npm install
npm run dev
```

### Checks

```bash
npm run build:fe
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Starting a new app from this template

1. Rename product metadata in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Replace the example `template_items` entity with your own schema and command module.
3. Keep the store and API boundary shape until you actually need more granular invalidation.
4. Pull optional ideas from `reference/` only after the new domain model is stable.
5. Update `docs/reference-map.md` to document what your project now treats as core vs optional.
6. Use `docs/template-items-module.md` when cloning the example CRUD module into a real feature.
