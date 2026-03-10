import { create } from 'zustand';
import { ItemsApi } from '../api/client';
import type {
    CreateTemplateItemInput,
    ImportResult,
    TemplateItemFilters,
    TemplateItemPage,
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
    loadItemsPage: (page?: number, pageSize?: number, filters?: TemplateItemFilters) => Promise<void>;
    addItem: (data: CreateTemplateItemInput) => Promise<void>;
    importItems: (rows: CreateTemplateItemInput[]) => Promise<ImportResult<CreateTemplateItemInput>>;
    updateItem: (id: string, data: UpdateTemplateItemInput) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
};

const defaultFilters: TemplateItemFilters = { query: '', status: 'all' };

export const useTemplateItemsStore = create<TemplateItemsState>((set, get) => ({
    itemsPage: null,
    itemsLoading: false,
    itemsError: null,
    currentPage: 1,
    currentPageSize: DEFAULT_PAGE_SIZE,
    currentFilters: defaultFilters,

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

        const success = outcomes.length - failedRows.length;
        if (success > 0) {
            await refreshTemplateItemsRuntime(get);
        }

        return {
            success,
            failed: failedRows.length,
            failedRows,
        };
    },

    updateItem: async (id, data) => {
        await ItemsApi.update(id, data);
        await refreshTemplateItemsRuntime(get);
    },

    deleteItem: async id => {
        await ItemsApi.delete(id);

        const { itemsPage, currentPage } = get();
        const shouldStepBack = currentPage > 1 && itemsPage && itemsPage.items.length <= 1;
        if (shouldStepBack) {
            set({ currentPage: currentPage - 1 });
        }

        await refreshTemplateItemsRuntime(get);
    },
}));

async function refreshTemplateItemsRuntime(get: () => TemplateItemsState) {
    const { currentPage, currentPageSize, currentFilters, loadItemsPage } = get();
    await Promise.all([
        useAppShellStore.getState().loadOverview(),
        loadItemsPage(currentPage, currentPageSize, currentFilters),
    ]);
}

export const templateItemsDefaultFilters = defaultFilters;
