# Template Items Module

## Goal

`src/modules/template-items` is the copyable example module inside template core.

It keeps four things together:

- module copy and status metadata
- page interaction controller
- filter panel
- list and editor components

## Files

- `src/modules/template-items/TemplateItemsModule.tsx`
- `src/modules/template-items/useTemplateItemsController.ts`
- `src/modules/template-items/constants.ts`
- `src/modules/template-items/components/TemplateItemEditor.tsx`
- `src/modules/template-items/components/TemplateItemsFilters.tsx`
- `src/modules/template-items/components/TemplateItemsList.tsx`

## Copy workflow for a new domain

1. Copy `src/modules/template-items` to a new module directory.
2. Replace `TemplateItem` types in `src/api/types.ts`.
3. Replace `ItemsApi` calls in `src/api/client.ts` with the new command names.
4. Update `src/store/useTemplateItemsStore.ts` selectors and actions for the new entity.
5. Change the copy in `constants.ts`.
6. Swap the editor fields first, then adjust filters and list columns.

## Design constraints

- Keep one module entry component and one controller hook.
- Do not let page files own domain logic.
- Keep Tauri command names outside the module UI components.
- Keep write flows routed through store actions so `refreshAll()` remains centralized.

## When to split further

Split the controller or list rendering only if one of these becomes true:

- the module gains more than one editor flow
- server-side filtering becomes materially more complex
- one record row becomes too dense to read in one component
- the module needs domain-specific subroutes
