import { create } from 'zustand';
import { ItemsApi, OverviewApi } from '../api/client';
import type {
    CreateTemplateItemInput,
    TemplateItemFilters,
    TemplateItemPage,
    TemplateOverview,
    UpdateTemplateItemInput,
} from '../api/types';

export const DEFAULT_PAGE_SIZE = 12;

type StoreState = {
    initialized: boolean;
    overview: TemplateOverview | null;
    overviewLoading: boolean;
    itemsPage: TemplateItemPage | null;
    itemsLoading: boolean;
    itemsError: string | null;
    currentPage: number;
    currentPageSize: number;
    currentFilters: TemplateItemFilters;
    loadOverview: () => Promise<void>;
    loadItemsPage: (page?: number, pageSize?: number, filters?: TemplateItemFilters) => Promise<void>;
    addItem: (data: CreateTemplateItemInput) => Promise<void>;
    updateItem: (id: string, data: UpdateTemplateItemInput) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    init: () => Promise<void>;
    refreshAll: () => Promise<void>;
};

const defaultFilters: TemplateItemFilters = { query: '', status: 'all' };

export const useStore = create<StoreState>((set, get) => ({
    initialized: false,
    overview: null,
    overviewLoading: false,
    itemsPage: null,
    itemsLoading: false,
    itemsError: null,
    currentPage: 1,
    currentPageSize: DEFAULT_PAGE_SIZE,
    currentFilters: defaultFilters,

    loadOverview: async () => {
        set({ overviewLoading: true });
        try {
            const overview = await OverviewApi.get();
            set({ overview, overviewLoading: false });
        } catch (error) {
            console.error('Failed to load overview', error);
            set({ overviewLoading: false });
        }
    },

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
        await get().refreshAll();
    },

    updateItem: async (id, data) => {
        await ItemsApi.update(id, data);
        await get().refreshAll();
    },

    deleteItem: async id => {
        await ItemsApi.delete(id);

        const { itemsPage, currentPage } = get();
        const shouldStepBack = currentPage > 1 && itemsPage && itemsPage.items.length <= 1;
        if (shouldStepBack) {
            set({ currentPage: currentPage - 1 });
        }

        await get().refreshAll();
    },

    init: async () => {
        if (get().initialized) {
            return;
        }

        set({ initialized: true });
        await Promise.all([
            get().loadOverview(),
            get().loadItemsPage(1, DEFAULT_PAGE_SIZE, defaultFilters),
        ]);
    },

    refreshAll: async () => {
        const { currentPage, currentPageSize, currentFilters } = get();
        await Promise.all([
            get().loadOverview(),
            get().loadItemsPage(currentPage, currentPageSize, currentFilters),
        ]);
    },
}));
