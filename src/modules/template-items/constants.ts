import type { TemplateItemFilters, TemplateItemStatus, TemplateItemStepStatus } from '../../api/types';

export const templateItemStatusOptions: Array<{
    label: string;
    value: TemplateItemFilters['status'];
}> = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
];

export const templateItemStatusBadgeMap: Record<TemplateItemStatus, string> = {
    draft: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-200 text-slate-700',
};

export const templateItemStepStatusBadgeMap: Record<TemplateItemStepStatus, string> = {
    pending: 'bg-orange-100 text-orange-700',
    done: 'bg-emerald-100 text-emerald-700',
};

export const templateItemsCopy = {
    eyebrow: 'Example CRUD',
    title: 'Items',
    description:
        'This module is intentionally small but complete: filters, pagination, batch actions, create, update and delete. Replace the entity shape, keep the control flow.',
    deleteTitle: 'Delete template item',
    deleteDescription:
        'This keeps the delete flow in template core so new projects have a complete reference loop.',
    emptyDefault:
        'Create the first example record and use it as a baseline for your own domain entity.',
    emptyFiltered: 'No records match the current filters.',
    stepsTitle: 'Steps',
    stepsDescription:
        'This child table demonstrates parent-child writes, aggregate counts, and transactional refresh flow without pushing child state into global runtime by default.',
} as const;
