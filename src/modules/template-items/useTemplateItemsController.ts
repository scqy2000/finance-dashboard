import { useEffect, useMemo, useState } from 'react';
import type { CreateTemplateItemInput, TemplateItem, TemplateItemFilters, TemplateItemStatus } from '../../api/types';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { useTemplateItemsStore } from '../../store/useTemplateItemsStore';
import { getErrorMessage } from '../../utils/errors';
import { templateItemsCopy } from './constants';

export function useTemplateItemsController() {
    const { toast, confirm } = useFeedback();
    const itemsPage = useTemplateItemsStore(state => state.itemsPage);
    const itemsLoading = useTemplateItemsStore(state => state.itemsLoading);
    const itemsError = useTemplateItemsStore(state => state.itemsError);
    const currentFilters = useTemplateItemsStore(state => state.currentFilters);
    const currentPage = useTemplateItemsStore(state => state.currentPage);
    const currentPageSize = useTemplateItemsStore(state => state.currentPageSize);
    const lastImportBatch = useTemplateItemsStore(state => state.lastImportBatch);
    const loadItemsPage = useTemplateItemsStore(state => state.loadItemsPage);
    const addItem = useTemplateItemsStore(state => state.addItem);
    const importItems = useTemplateItemsStore(state => state.importItems);
    const undoLastImport = useTemplateItemsStore(state => state.undoLastImport);
    const clearLastImportBatch = useTemplateItemsStore(state => state.clearLastImportBatch);
    const updateItem = useTemplateItemsStore(state => state.updateItem);
    const deleteItem = useTemplateItemsStore(state => state.deleteItem);
    const deleteItems = useTemplateItemsStore(state => state.deleteItems);
    const updateItemsStatus = useTemplateItemsStore(state => state.updateItemsStatus);

    const [draftFilters, setDraftFilters] = useState<TemplateItemFilters>(currentFilters);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

    useEffect(() => {
        setDraftFilters(currentFilters);
    }, [currentFilters]);

    useEffect(() => {
        const visibleIds = new Set((itemsPage?.items ?? []).map(item => item.id));
        setSelectedItemIds(prev => prev.filter(id => visibleIds.has(id)));
    }, [itemsPage?.items]);

    const emptyStateMessage = useMemo(() => {
        if (draftFilters.query || (draftFilters.status && draftFilters.status !== 'all')) {
            return templateItemsCopy.emptyFiltered;
        }
        return templateItemsCopy.emptyDefault;
    }, [draftFilters]);

    const selectedItems = useMemo(() => {
        const itemMap = new Map((itemsPage?.items ?? []).map(item => [item.id, item]));
        return selectedItemIds.map(id => itemMap.get(id)).filter((item): item is TemplateItem => Boolean(item));
    }, [itemsPage?.items, selectedItemIds]);

    const visibleItemIds = useMemo(() => (itemsPage?.items ?? []).map(item => item.id), [itemsPage?.items]);
    const allVisibleSelected = visibleItemIds.length > 0 && visibleItemIds.every(id => selectedItemIds.includes(id));

    const handleApplyFilters = async () => {
        try {
            setSelectedItemIds([]);
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
            templateItemsCopy.deleteTitle,
            `Delete "${item.title}"?\n\n${templateItemsCopy.deleteDescription}`,
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteItem(item.id);
            setSelectedItemIds(prev => prev.filter(id => id !== item.id));
            toast('Template item deleted.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to delete item'), 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) {
            return;
        }

        const confirmed = await confirm(
            'Delete selected items',
            `Delete ${selectedItems.length} selected items?\n\nThis also removes their child steps through the same transaction boundary.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteItems(selectedItemIds);
            setSelectedItemIds([]);
            toast(`${selectedItems.length} items deleted.`, 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to delete selected items'), 'error');
        }
    };

    const handleBulkStatusUpdate = async (status: TemplateItemStatus) => {
        if (selectedItems.length === 0) {
            return;
        }

        try {
            await updateItemsStatus(selectedItemIds, status);
            toast(`${selectedItems.length} items moved to ${status}.`, 'success');
        } catch (error) {
            toast(getErrorMessage(error, `Failed to update selected items to ${status}`), 'error');
        }
    };

    const handleUndoLastImport = async () => {
        if (!lastImportBatch) {
            return;
        }

        const accepted = await confirm(
            'Undo last import',
            `Remove ${lastImportBatch.count} items created by the last CSV import?\n\nThis action also removes any child steps created under those imported items.`,
        );

        if (!accepted) {
            return;
        }

        try {
            await undoLastImport();
            setSelectedItemIds([]);
            toast(`Removed ${lastImportBatch.count} imported items.`, 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to undo last import'), 'error');
        }
    };

    const toggleSelectedItem = (itemId: string) => {
        setSelectedItemIds(prev => (prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]));
    };

    const toggleSelectAllVisible = () => {
        setSelectedItemIds(prev => {
            if (allVisibleSelected) {
                return prev.filter(id => !visibleItemIds.includes(id));
            }

            const next = new Set(prev);
            visibleItemIds.forEach(id => next.add(id));
            return Array.from(next);
        });
    };

    return {
        draftFilters,
        setDraftFilters,
        itemsPage,
        itemsLoading,
        itemsError,
        currentFilters,
        currentPage,
        currentPageSize,
        emptyStateMessage,
        isModalOpen,
        editingItem,
        selectedItemIds,
        selectedItems,
        allVisibleSelected,
        lastImportBatch,
        setIsModalOpen,
        setEditingItem,
        setSelectedItemIds,
        clearLastImportBatch,
        handleApplyFilters,
        handleImportRows: importItems,
        handleSaveItem,
        handleDelete,
        handleBulkDelete,
        handleBulkStatusUpdate,
        handleUndoLastImport,
        toggleSelectedItem,
        toggleSelectAllVisible,
        refreshPage: () => loadItemsPage(currentPage, currentPageSize, currentFilters),
        goToPreviousPage: () => loadItemsPage((itemsPage?.page ?? currentPage) - 1, currentPageSize, currentFilters),
        goToNextPage: () => loadItemsPage((itemsPage?.page ?? currentPage) + 1, currentPageSize, currentFilters),
    };
}
