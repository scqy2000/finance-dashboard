import { create } from 'zustand';
import { ItemsApi } from '../api/client';
import type {
    CreateTemplateItemInput,
    ImportResult,
    RecentImportBatch,
    TemplateItemFilters,
    TemplateItemPage,
    TemplateItemStatus,
    UpdateTemplateItemInput,
} from '../api/types';
import { useAppShellStore } from './useAppShellStore';

export const DEFAULT_PAGE_SIZE = 12;

type TemplateItemsState = {
    itemsPage: TemplateItemPage | null;
    itemsLoading: boolean;
    itemsError: string | null;
    currentPage: number;
    currentPageSize: number;
    currentFilters: TemplateItemFilters;
    lastImportBatch: RecentImportBatch | null;
    loadItemsPage: (page?: number, pageSize?: number, filters?: TemplateItemFilters) => Promise<void>;
    addItem: (data: CreateTemplateItemInput) => Promise<void>;
    importItems: (rows: CreateTemplateItemInput[]) => Promise<ImportResult<CreateTemplateItemInput>>;
    undoLastImport: () => Promise<void>;
    clearLastImportBatch: () => void;
    updateItem: (id: string, data: UpdateTemplateItemInput) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    deleteItems: (ids: string[]) => Promise<void>;
    updateItemsStatus: (ids: string[], status: TemplateItemStatus) => Promise<void>;
};

const defaultFilters: TemplateItemFilters = { query: '', status: 'all' };

export const useTemplateItemsStore = create<TemplateItemsState>((set, get) => ({
    itemsPage: null,
    itemsLoading: false,
    itemsError: null,
    currentPage: 1,
    currentPageSize: DEFAULT_PAGE_SIZE,
    currentFilters: defaultFilters,
    lastImportBatch: null,

    loadItemsPage: async (page, pageSize, filters) => {
        const nextPage = page ?? get().currentPage;
        const nextPageSize = pageSize ?? get().currentPageSize;
        const nextFilters = filters ?? get().currentFilters;

        set({
            itemsLoading: true,
            itemsError: null,
            currentPage: nextPage,
            currentPageSize: nextPageSize,
            currentFilters: nextFilters,
        });

        try {
            const itemsPage = await ItemsApi.getPage(nextPage, nextPageSize, nextFilters);
            set({ itemsPage, itemsLoading: false });
        } catch (error) {
            console.error('Failed to load items page', error);
            set({
                itemsLoading: false,
                itemsError: error instanceof Error ? error.message : 'Failed to load items',
            });
        }
    },

    addItem: async data => {
        clearLastImportBatch(set);
        await ItemsApi.create(data);
        await refreshTemplateItemsRuntime(get);
    },

    importItems: async rows => {
        const outcomes = await Promise.allSettled(rows.map(row => ItemsApi.create(row)));
        const failedRows = outcomes.flatMap((outcome, index) => {
            if (outcome.status === 'fulfilled') {
                return [];
            }

            return [{
                index: index + 1,
                reason: outcome.reason instanceof Error ? outcome.reason.message : 'Failed to import row',
                row: rows[index],
            }];
        });

        const importedIds = outcomes.flatMap(outcome => (outcome.status === 'fulfilled' ? [outcome.value.id] : []));
        const success = importedIds.length;

        if (success > 0) {
            set({
                lastImportBatch: {
                    ids: importedIds,
                    count: importedIds.length,
                    createdAt: new Date().toISOString(),
                },
            });
            await refreshTemplateItemsRuntime(get);
        } else {
            clearLastImportBatch(set);
        }

        return {
            success,
            failed: failedRows.length,
            failedRows,
            importedIds,
        };
    },

    undoLastImport: async () => {
        const batch = get().lastImportBatch;
        if (!batch || batch.ids.length === 0) {
            return;
        }

        await ItemsApi.deleteMany({ ids: batch.ids });
        clearLastImportBatch(set);
        adjustPageAfterDeletion(set, get, batch.ids.length);
        await refreshTemplateItemsRuntime(get);
    },

    clearLastImportBatch: () => {
        clearLastImportBatch(set);
    },

    updateItem: async (id, data) => {
        clearLastImportBatch(set);
        await ItemsApi.update(id, data);
        await refreshTemplateItemsRuntime(get);
    },

    deleteItem: async id => {
        clearLastImportBatch(set);
        await ItemsApi.delete(id);
        adjustPageAfterDeletion(set, get, 1);
        await refreshTemplateItemsRuntime(get);
    },

    deleteItems: async ids => {
        if (ids.length === 0) {
            return;
        }

        clearLastImportBatch(set);
        await ItemsApi.deleteMany({ ids });
        adjustPageAfterDeletion(set, get, ids.length);
        await refreshTemplateItemsRuntime(get);
    },

    updateItemsStatus: async (ids, status) => {
        if (ids.length === 0) {
            return;
        }

        clearLastImportBatch(set);
        await ItemsApi.updateStatusMany({ ids, status });
        await refreshTemplateItemsRuntime(get);
    },
}));

function clearLastImportBatch(set: (partial: Partial<TemplateItemsState>) => void) {
    set({ lastImportBatch: null });
}

function adjustPageAfterDeletion(
    set: (partial: Partial<TemplateItemsState>) => void,
    get: () => TemplateItemsState,
    removedCount: number,
) {
    const { itemsPage, currentPage } = get();
    const visibleCount = itemsPage?.items.length ?? 0;
    const shouldStepBack = currentPage > 1 && visibleCount > 0 && removedCount >= visibleCount;
    if (shouldStepBack) {
        set({ currentPage: currentPage - 1 });
    }
}

async function refreshTemplateItemsRuntime(get: () => TemplateItemsState) {
    const { currentPage, currentPageSize, currentFilters, loadItemsPage } = get();
    await Promise.all([
        useAppShellStore.getState().loadOverview(),
        loadItemsPage(currentPage, currentPageSize, currentFilters),
    ]);
}

export const templateItemsDefaultFilters = defaultFilters;
