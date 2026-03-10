import { Plus, RefreshCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CreateTemplateItemInput, TemplateItem, TemplateItemFilters, TemplateItemStatus } from '../api/types';
import { ItemModal } from '../components/ItemModal';
import { useFeedback } from '../components/ui/FeedbackProvider';
import { useStore } from '../store/useStore';
import { getErrorMessage } from '../utils/errors';

const statusOptions: Array<{ label: string; value: TemplateItemFilters['status'] }> = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
];

const statusBadgeMap: Record<TemplateItemStatus, string> = {
    draft: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-200 text-slate-700',
};

const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
};

export function Items() {
    const { toast, confirm } = useFeedback();
    const itemsPage = useStore(state => state.itemsPage);
    const itemsLoading = useStore(state => state.itemsLoading);
    const itemsError = useStore(state => state.itemsError);
    const currentFilters = useStore(state => state.currentFilters);
    const currentPage = useStore(state => state.currentPage);
    const currentPageSize = useStore(state => state.currentPageSize);
    const loadItemsPage = useStore(state => state.loadItemsPage);
    const addItem = useStore(state => state.addItem);
    const updateItem = useStore(state => state.updateItem);
    const deleteItem = useStore(state => state.deleteItem);

    const [draftFilters, setDraftFilters] = useState<TemplateItemFilters>(currentFilters);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

    useEffect(() => {
        setDraftFilters(currentFilters);
    }, [currentFilters]);

    const emptyStateMessage = useMemo(() => {
        if (draftFilters.query || (draftFilters.status && draftFilters.status !== 'all')) {
            return 'No records match the current filters.';
        }
        return 'Create the first example record and use it as a baseline for your own domain entity.';
    }, [draftFilters]);

    const handleApplyFilters = async () => {
        try {
            await loadItemsPage(1, currentPageSize, draftFilters);
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to apply filters'), 'error');
        }
    };

    const handleSaveItem = async (data: CreateTemplateItemInput) => {
        try {
            if (editingItem) {
                await updateItem(editingItem.id, data);
                toast('Template item updated.', 'success');
                return;
            }

            await addItem(data);
            toast('Template item created.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to save item'), 'error');
            throw error;
        }
    };

    const handleDelete = async (item: TemplateItem) => {
        const confirmed = await confirm(
            'Delete template item',
            `Delete "${item.title}"?\n\nThis keeps the delete flow in template core so new projects have a complete reference loop.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteItem(item.id);
            toast('Template item deleted.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to delete item'), 'error');
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item: TemplateItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Example CRUD</div>
                    <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Items</h1>
                    <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[var(--text-secondary)]">
                        This page is intentionally small but complete: filters, pagination, create, update and delete. Replace
                        the entity shape, keep the control flow.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn-secondary" onClick={() => loadItemsPage(currentPage, currentPageSize, currentFilters)}>
                        <RefreshCcw size={16} />
                        Refresh
                    </button>
                    <button type="button" className="btn-primary" onClick={openCreateModal}>
                        <Plus size={16} />
                        New item
                    </button>
                </div>
            </header>

            <article className="glass-panel p-5">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr,0.8fr,auto]">
                    <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                        Search
                        <div className="flex items-center gap-3 rounded-[16px] border border-[var(--border-light)] bg-white/75 px-4 py-3">
                            <Search size={16} className="text-[var(--text-tertiary)]" />
                            <input
                                type="text"
                                value={draftFilters.query ?? ''}
                                onChange={event => setDraftFilters(prev => ({ ...prev, query: event.target.value }))}
                                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                                placeholder="Search by title or summary"
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                        Status
                        <select
                            value={draftFilters.status ?? 'all'}
                            onChange={event => setDraftFilters(prev => ({ ...prev, status: event.target.value as TemplateItemFilters['status'] }))}
                            className="rounded-[16px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value ?? 'all'}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button type="button" className="btn-primary w-full justify-center xl:w-auto" onClick={handleApplyFilters}>
                            Apply filters
                        </button>
                    </div>
                </div>
            </article>

            <article className="glass-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
                    <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">Paginated records</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                            {itemsPage ? `${itemsPage.total} total records` : 'Loading records'}
                        </div>
                    </div>
                    {itemsPage && (
                        <div className="text-xs text-[var(--text-secondary)]">
                            Page {itemsPage.page} of {Math.max(itemsPage.total_pages, 1)}
                        </div>
                    )}
                </div>

                {itemsError && <div className="px-5 py-4 text-sm text-[var(--color-danger)]">{itemsError}</div>}

                {itemsLoading && !itemsPage ? (
                    <div className="px-5 py-8 text-sm text-[var(--text-secondary)]">Loading items...</div>
                ) : itemsPage && itemsPage.items.length > 0 ? (
                    <div className="divide-y divide-[var(--border-light)]">
                        {itemsPage.items.map(item => (
                            <div key={item.id} className="flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h2>
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeMap[item.status]}`}>
                                            {item.status}
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

                                <div className="flex gap-3 xl:shrink-0">
                                    <button type="button" className="btn-secondary" onClick={() => openEditModal(item)}>
                                        Edit
                                    </button>
                                    <button type="button" className="btn-secondary" onClick={() => handleDelete(item)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
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
                            onClick={() => loadItemsPage((itemsPage?.page ?? currentPage) - 1, currentPageSize, currentFilters)}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={!itemsPage || !itemsPage.has_more || itemsLoading}
                            onClick={() => loadItemsPage((itemsPage?.page ?? currentPage) + 1, currentPageSize, currentFilters)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </article>

            <ItemModal
                isOpen={isModalOpen}
                item={editingItem}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                onSave={handleSaveItem}
            />
        </section>
    );
}
