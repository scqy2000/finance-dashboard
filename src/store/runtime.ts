import { templateItemsDefaultFilters, DEFAULT_PAGE_SIZE, useTemplateItemsStore } from './useTemplateItemsStore';
import { useAppShellStore } from './useAppShellStore';

export async function initializeTemplateRuntime() {
    const appShell = useAppShellStore.getState();

    if (appShell.initialized) {
        return;
    }

    appShell.markInitialized();

    await Promise.all([
        appShell.loadOverview(),
        useTemplateItemsStore.getState().loadItemsPage(1, DEFAULT_PAGE_SIZE, templateItemsDefaultFilters),
    ]);
}

export async function refreshTemplateRuntime() {
    const { loadOverview } = useAppShellStore.getState();
    const { currentPage, currentPageSize, currentFilters, loadItemsPage } = useTemplateItemsStore.getState();

    await Promise.all([
        loadOverview(),
        loadItemsPage(currentPage, currentPageSize, currentFilters),
    ]);
}
