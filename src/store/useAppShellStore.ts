import { create } from 'zustand';
import { OverviewApi } from '../api/client';
import type { TemplateOverview } from '../api/types';

type AppShellState = {
    initialized: boolean;
    overview: TemplateOverview | null;
    overviewLoading: boolean;
    loadOverview: () => Promise<void>;
    markInitialized: () => void;
};

export const useAppShellStore = create<AppShellState>(set => ({
    initialized: false,
    overview: null,
    overviewLoading: false,

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

    markInitialized: () => set({ initialized: true }),
}));
