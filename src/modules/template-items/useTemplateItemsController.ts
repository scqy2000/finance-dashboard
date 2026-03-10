import { useEffect, useMemo, useState } from 'react';
import type { CreateTemplateItemInput, TemplateItem, TemplateItemFilters } from '../../api/types';
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
    const loadItemsPage = useTemplateItemsStore(state => state.loadItemsPage);
    const addItem = useTemplateItemsStore(state => state.addItem);
    const importItems = useTemplateItemsStore(state => state.importItems);
    const updateItem = useTemplateItemsStore(state => state.updateItem);
    const deleteItem = useTemplateItemsStore(state => state.deleteItem);

    const [draftFilters, setDraftFilters] = useState<TemplateItemFilters>(currentFilters);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

    useEffect(() => {
        setDraftFilters(currentFilters);
    }, [currentFilters]);

    const emptyStateMessage = useMemo(() => {
        if (draftFilters.query || (draftFilters.status && draftFilters.status !== 'all')) {
            return templateItemsCopy.emptyFiltered;
        }
        return templateItemsCopy.emptyDefault;
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
            templateItemsCopy.deleteTitle,
            `Delete "${item.title}"?\n\n${templateItemsCopy.deleteDescription}`,
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

    return {
        draftFilters,
        setDraftFilters,
        currentFilters,
        currentPage,
        currentPageSize,
        itemsPage,
        itemsLoading,
        itemsError,
        emptyStateMessage,
        isModalOpen,
        editingItem,
        setIsModalOpen,
        setEditingItem,
        handleApplyFilters,
        handleImportRows: importItems,
        handleSaveItem,
        handleDelete,
        refreshPage: () => loadItemsPage(currentPage, currentPageSize, currentFilters),
        goToPreviousPage: () => loadItemsPage((itemsPage?.page ?? currentPage) - 1, currentPageSize, currentFilters),
        goToNextPage: () => loadItemsPage((itemsPage?.page ?? currentPage) + 1, currentPageSize, currentFilters),
    };
}
