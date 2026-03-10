import type {
    AppInfo,
    BulkTemplateItemsInput,
    BulkUpdateTemplateItemStatusInput,
    CreateTemplateItemInput,
    CreateTemplateItemStepInput,
    TemplateItem,
    TemplateItemFilters,
    TemplateItemPage,
    TemplateItemStep,
    TemplateOverview,
    UpdateTemplateItemInput,
    UpdateTemplateItemStepInput,
} from './types';

const previewItemsKey = 'template_preview_items_v1';
const previewStepsKey = 'template_preview_item_steps_v1';
const previewSettingsKey = 'template_preview_settings_v1';

const welcomeTimestamp = new Date().toISOString();

const seedItems = (): TemplateItem[] => [
    {
        id: 'welcome-template-item',
        title: 'Start with one small example entity',
        summary: 'Browser preview mode keeps the CRUD loop usable even without a Tauri runtime.',
        status: 'active',
        created_at: welcomeTimestamp,
        updated_at: welcomeTimestamp,
    },
];

const seedSteps = (): TemplateItemStep[] => [
    {
        id: 'welcome-step-1',
        item_id: 'welcome-template-item',
        title: 'Rename the template metadata',
        status: 'done',
        created_at: welcomeTimestamp,
        updated_at: welcomeTimestamp,
    },
    {
        id: 'welcome-step-2',
        item_id: 'welcome-template-item',
        title: 'Replace the example entity with your own domain',
        status: 'pending',
        created_at: welcomeTimestamp,
        updated_at: welcomeTimestamp,
    },
];

const sortItems = (items: TemplateItem[]) =>
    [...items].sort((left, right) => right.updated_at.localeCompare(left.updated_at));

const sortSteps = (steps: TemplateItemStep[]) =>
    [...steps].sort((left, right) => {
        if (left.status !== right.status) {
            return left.status === 'pending' ? -1 : 1;
        }
        return right.updated_at.localeCompare(left.updated_at);
    });

const nextId = (prefix: string) => globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;

const writePreviewItems = (items: TemplateItem[]) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(previewItemsKey, JSON.stringify(items));
};

const writePreviewSteps = (steps: TemplateItemStep[]) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(previewStepsKey, JSON.stringify(steps));
};

const readPreviewItemsRaw = (): TemplateItem[] => {
    if (typeof window === 'undefined') {
        return seedItems();
    }

    const raw = window.localStorage.getItem(previewItemsKey);
    if (!raw) {
        const seeded = seedItems();
        writePreviewItems(seeded);
        return seeded;
    }

    try {
        const parsed = JSON.parse(raw) as TemplateItem[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
            const seeded = seedItems();
            writePreviewItems(seeded);
            return seeded;
        }
        return parsed;
    } catch {
        const seeded = seedItems();
        writePreviewItems(seeded);
        return seeded;
    }
};

const readPreviewStepsRaw = (): TemplateItemStep[] => {
    if (typeof window === 'undefined') {
        return seedSteps();
    }

    const raw = window.localStorage.getItem(previewStepsKey);
    if (!raw) {
        const seeded = seedSteps();
        writePreviewSteps(seeded);
        return seeded;
    }

    try {
        const parsed = JSON.parse(raw) as TemplateItemStep[];
        if (!Array.isArray(parsed)) {
            const seeded = seedSteps();
            writePreviewSteps(seeded);
            return seeded;
        }
        return parsed;
    } catch {
        const seeded = seedSteps();
        writePreviewSteps(seeded);
        return seeded;
    }
};

const computeStepStats = (steps: TemplateItemStep[]) => {
    const stats = new Map<string, { total_steps: number; completed_steps: number }>();

    for (const step of steps) {
        const current = stats.get(step.item_id) ?? { total_steps: 0, completed_steps: 0 };
        current.total_steps += 1;
        if (step.status === 'done') {
            current.completed_steps += 1;
        }
        stats.set(step.item_id, current);
    }

    return stats;
};

const hydrateItems = (items: TemplateItem[], steps: TemplateItemStep[]) => {
    const stats = computeStepStats(steps);
    return sortItems(items).map(item => {
        const itemStats = stats.get(item.id) ?? { total_steps: 0, completed_steps: 0 };
        return {
            ...item,
            ...itemStats,
        };
    });
};

const readPreviewItems = () => hydrateItems(readPreviewItemsRaw(), readPreviewStepsRaw());

const readPreviewSettings = () => {
    if (typeof window === 'undefined') {
        return {} as Record<string, string>;
    }

    const raw = window.localStorage.getItem(previewSettingsKey);
    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw) as Record<string, string>;
    } catch {
        return {};
    }
};

const writePreviewSettings = (settings: Record<string, string>) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(previewSettingsKey, JSON.stringify(settings));
};

const normalizeFilters = (filters?: TemplateItemFilters) => ({
    query: filters?.query?.trim().toLowerCase() || '',
    status: filters?.status && filters.status !== 'all' ? filters.status : null,
});

const computeOverview = (items: TemplateItem[]): TemplateOverview => ({
    total_items: items.length,
    active_items: items.filter(item => item.status === 'active').length,
    archived_items: items.filter(item => item.status === 'archived').length,
    draft_items: items.filter(item => item.status === 'draft').length,
});

const requireExistingItemIds = (items: TemplateItem[], ids: string[]) => {
    const itemIds = new Set(items.map(item => item.id));
    for (const id of ids) {
        if (!itemIds.has(id)) {
            throw new Error('item not found');
        }
    }
};

const normalizeBatchIds = (input: BulkTemplateItemsInput) => {
    const ids = Array.from(new Set(input.ids.map(id => id.trim()).filter(Boolean)));
    if (ids.length === 0) {
        throw new Error('at least one item id is required');
    }
    return ids;
};

export const BrowserPreviewApi = {
    async getAll(limit?: number) {
        return readPreviewItems().slice(0, limit ?? 5000);
    },

    async getPage(page = 1, pageSize = 12, filters?: TemplateItemFilters): Promise<TemplateItemPage> {
        const normalized = normalizeFilters(filters);
        const filteredItems = readPreviewItems().filter(item => {
            const matchesQuery =
                !normalized.query ||
                item.title.toLowerCase().includes(normalized.query) ||
                item.summary.toLowerCase().includes(normalized.query);
            const matchesStatus = !normalized.status || item.status === normalized.status;
            return matchesQuery && matchesStatus;
        });

        const total = filteredItems.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;

        return {
            items: filteredItems.slice(startIndex, startIndex + pageSize),
            total,
            page,
            page_size: pageSize,
            total_pages: totalPages,
            has_more: page < totalPages,
        };
    },

    async create(data: CreateTemplateItemInput) {
        const items = readPreviewItemsRaw();
        const timestamp = new Date().toISOString();
        const nextItem: TemplateItem = {
            id: nextId('preview-item'),
            title: data.title.trim(),
            summary: data.summary.trim(),
            status: data.status,
            created_at: timestamp,
            updated_at: timestamp,
            total_steps: 0,
            completed_steps: 0,
        };

        writePreviewItems([nextItem, ...items]);
        return nextItem;
    },

    async update(id: string, data: UpdateTemplateItemInput) {
        const items = readPreviewItemsRaw();
        const current = items.find(item => item.id === id);
        if (!current) {
            throw new Error('item not found');
        }

        const nextItem: TemplateItem = {
            ...current,
            ...data,
            title: data.title?.trim() || current.title,
            summary: data.summary?.trim() ?? current.summary,
            updated_at: new Date().toISOString(),
        };

        writePreviewItems(items.map(item => (item.id === id ? nextItem : item)));
        return hydrateItems([nextItem], readPreviewStepsRaw())[0];
    },

    async delete(id: string) {
        const items = readPreviewItemsRaw();
        const steps = readPreviewStepsRaw();
        writePreviewItems(items.filter(item => item.id !== id));
        writePreviewSteps(steps.filter(step => step.item_id !== id));
    },

    async deleteMany(input: BulkTemplateItemsInput) {
        const ids = normalizeBatchIds(input);
        const items = readPreviewItemsRaw();
        requireExistingItemIds(items, ids);
        const steps = readPreviewStepsRaw();
        const idSet = new Set(ids);
        writePreviewItems(items.filter(item => !idSet.has(item.id)));
        writePreviewSteps(steps.filter(step => !idSet.has(step.item_id)));
        return ids.length;
    },

    async updateStatusMany(input: BulkUpdateTemplateItemStatusInput) {
        const ids = normalizeBatchIds(input);
        const items = readPreviewItemsRaw();
        requireExistingItemIds(items, ids);
        const idSet = new Set(ids);
        const timestamp = new Date().toISOString();
        writePreviewItems(
            items.map(item =>
                idSet.has(item.id)
                    ? {
                          ...item,
                          status: input.status,
                          updated_at: timestamp,
                      }
                    : item,
            ),
        );
        return ids.length;
    },

    async getSteps(itemId: string) {
        const items = readPreviewItemsRaw();
        if (!items.some(item => item.id === itemId)) {
            throw new Error('item not found');
        }

        return sortSteps(readPreviewStepsRaw().filter(step => step.item_id === itemId));
    },

    async createStep(itemId: string, data: CreateTemplateItemStepInput) {
        const items = readPreviewItemsRaw();
        const item = items.find(entry => entry.id === itemId);
        if (!item) {
            throw new Error('item not found');
        }

        const steps = readPreviewStepsRaw();
        const timestamp = new Date().toISOString();
        const nextStep: TemplateItemStep = {
            id: nextId('preview-step'),
            item_id: itemId,
            title: data.title.trim(),
            status: data.status,
            created_at: timestamp,
            updated_at: timestamp,
        };

        writePreviewSteps([nextStep, ...steps]);
        writePreviewItems(items.map(entry => (entry.id === itemId ? { ...entry, updated_at: timestamp } : entry)));
        return nextStep;
    },

    async updateStep(id: string, data: UpdateTemplateItemStepInput) {
        const steps = readPreviewStepsRaw();
        const current = steps.find(step => step.id === id);
        if (!current) {
            throw new Error('step not found');
        }

        const timestamp = new Date().toISOString();
        const nextStep: TemplateItemStep = {
            ...current,
            ...data,
            title: data.title?.trim() || current.title,
            status: data.status ?? current.status,
            updated_at: timestamp,
        };

        writePreviewSteps(steps.map(step => (step.id === id ? nextStep : step)));
        writePreviewItems(
            readPreviewItemsRaw().map(item =>
                item.id === current.item_id ? { ...item, updated_at: timestamp } : item,
            ),
        );
        return nextStep;
    },

    async deleteStep(id: string) {
        const steps = readPreviewStepsRaw();
        const current = steps.find(step => step.id === id);
        if (!current) {
            throw new Error('step not found');
        }

        const timestamp = new Date().toISOString();
        writePreviewSteps(steps.filter(step => step.id !== id));
        writePreviewItems(
            readPreviewItemsRaw().map(item =>
                item.id === current.item_id ? { ...item, updated_at: timestamp } : item,
            ),
        );
    },

    async getOverview() {
        return computeOverview(readPreviewItems());
    },

    async loadSetting(key: string) {
        return readPreviewSettings()[key] ?? null;
    },

    async saveSetting(key: string, value: string) {
        const settings = readPreviewSettings();
        settings[key] = value;
        writePreviewSettings(settings);
    },

    async clearSetting(key: string) {
        const settings = readPreviewSettings();
        delete settings[key];
        writePreviewSettings(settings);
    },

    async getInfo(): Promise<AppInfo> {
        return {
            version: 'browser-preview',
            userData: 'browser-localStorage',
            isPackaged: false,
        };
    },
};

export const isBrowserPreview = () => typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);
