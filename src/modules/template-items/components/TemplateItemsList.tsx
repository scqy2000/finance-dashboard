import type { TemplateItemPage, TemplateItem, TemplateItemStatus } from '../../../api/types';
import { templateItemStatusBadgeMap } from '../constants';

type TemplateItemsListProps = {
    itemsPage: TemplateItemPage | null;
    itemsLoading: boolean;
    itemsError: string | null;
    currentPageSize: number;
    emptyStateMessage: string;
    selectedItemIds: string[];
    allVisibleSelected: boolean;
    onToggleSelected: (itemId: string) => void;
    onToggleSelectAllVisible: () => void;
    onEdit: (item: TemplateItem) => void;
    onOpenSteps: (item: TemplateItem) => void;
    onDelete: (item: TemplateItem) => Promise<void>;
    onPreviousPage: () => Promise<void>;
    onNextPage: () => Promise<void>;
};

const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
};

const formatSteps = (item: TemplateItem) => {
    const total = item.total_steps ?? 0;
    const completed = item.completed_steps ?? 0;
    if (total === 0) {
        return 'Steps 0/0 done';
    }
    return `Steps ${completed}/${total} done`;
};

export function TemplateItemsList({
    itemsPage,
    itemsLoading,
    itemsError,
    currentPageSize,
    emptyStateMessage,
    selectedItemIds,
    allVisibleSelected,
    onToggleSelected,
    onToggleSelectAllVisible,
    onEdit,
    onOpenSteps,
    onDelete,
    onPreviousPage,
    onNextPage,
}: TemplateItemsListProps) {
    const selectedCount = selectedItemIds.length;

    return (
        <article className="glass-panel overflow-hidden" data-testid="template-items-list">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
                <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Paginated records</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                        {itemsPage ? `${itemsPage.total} total records` : 'Loading records'}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            data-testid="template-items-select-all"
                            checked={allVisibleSelected}
                            onChange={onToggleSelectAllVisible}
                            disabled={!itemsPage || itemsPage.items.length === 0}
                        />
                        Select page
                    </label>
                    {itemsPage && <div>Page {itemsPage.page} of {Math.max(itemsPage.total_pages, 1)}</div>}
                </div>
            </div>

            {selectedCount > 0 && (
                <div className="border-b border-[var(--border-light)] bg-[var(--bg-surface)]/70 px-5 py-3 text-xs text-[var(--text-secondary)]" data-testid="template-items-selection-summary">
                    {selectedCount} selected on the current page.
                </div>
            )}

            {itemsError && <div className="px-5 py-4 text-sm text-[var(--color-danger)]">{itemsError}</div>}

            {itemsLoading && !itemsPage ? (
                <div className="px-5 py-8 text-sm text-[var(--text-secondary)]">Loading items...</div>
            ) : itemsPage && itemsPage.items.length > 0 ? (
                <div className="divide-y divide-[var(--border-light)]">
                    {itemsPage.items.map(item => (
                        <TemplateItemsListRow
                            key={item.id}
                            item={item}
                            isSelected={selectedItemIds.includes(item.id)}
                            onToggleSelected={onToggleSelected}
                            onEdit={onEdit}
                            onOpenSteps={onOpenSteps}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="px-5 py-8 text-sm leading-6 text-[var(--text-secondary)]">{emptyStateMessage}</div>
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--border-light)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                    Page size {itemsPage?.page_size ?? currentPageSize}. Writes refresh overview and current list by default.
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="btn-secondary"
                        disabled={!itemsPage || itemsPage.page <= 1 || itemsLoading}
                        onClick={() => void onPreviousPage()}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        disabled={!itemsPage || !itemsPage.has_more || itemsLoading}
                        onClick={() => void onNextPage()}
                    >
                        Next
                    </button>
                </div>
            </div>
        </article>
    );
}

type TemplateItemsListRowProps = {
    item: TemplateItem;
    isSelected: boolean;
    onToggleSelected: (itemId: string) => void;
    onEdit: (item: TemplateItem) => void;
    onOpenSteps: (item: TemplateItem) => void;
    onDelete: (item: TemplateItem) => Promise<void>;
};

function TemplateItemsListRow({ item, isSelected, onToggleSelected, onEdit, onOpenSteps, onDelete }: TemplateItemsListRowProps) {
    const badgeClass = templateItemStatusBadgeMap[item.status as TemplateItemStatus];

    return (
        <div className="flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-start xl:justify-between" data-testid={`template-item-row-${item.id}`}>
            <div className="flex gap-4 min-w-0 flex-1">
                <label className="mt-1 flex shrink-0 items-start">
                    <input
                        type="checkbox"
                        data-testid={`template-item-select-${item.id}`}
                        checked={isSelected}
                        onChange={() => onToggleSelected(item.id)}
                    />
                </label>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badgeClass}`}>
                            {item.status}
                        </span>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700" data-testid={`template-item-steps-count-${item.id}`}>
                            {formatSteps(item)}
                        </span>
                    </div>
                    <p className="mt-3 max-w-[720px] whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                        {item.summary || 'No summary provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--text-tertiary)]">
                        <span>Created {formatDate(item.created_at)}</span>
                        <span>Updated {formatDate(item.updated_at)}</span>
                        <span className="break-all">ID {item.id}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 xl:shrink-0">
                <button type="button" className="btn-secondary" data-testid={`template-item-steps-${item.id}`} onClick={() => onOpenSteps(item)}>
                    Steps
                </button>
                <button type="button" className="btn-secondary" data-testid={`template-item-edit-${item.id}`} onClick={() => onEdit(item)}>
                    Edit
                </button>
                <button type="button" className="btn-secondary" data-testid={`template-item-delete-${item.id}`} onClick={() => void onDelete(item)}>
                    Delete
                </button>
            </div>
        </div>
    );
}
