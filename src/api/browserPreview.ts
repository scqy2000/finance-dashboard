import type {
    AppInfo,
    CreateTemplateItemInput,
    TemplateItem,
    TemplateItemFilters,
    TemplateItemPage,
    TemplateOverview,
    UpdateTemplateItemInput,
} from './types';

const previewItemsKey = 'template_preview_items_v1';
const previewSettingsKey = 'template_preview_settings_v1';

const seedItems = (): TemplateItem[] => [
    {
        id: 'welcome-template-item',
        title: 'Start with one small example entity',
        summary: 'Browser preview mode keeps the CRUD loop usable even without a Tauri runtime.',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const readPreviewItems = (): TemplateItem[] => {
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

const writePreviewItems = (items: TemplateItem[]) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(previewItemsKey, JSON.stringify(items));
};

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

const sortItems = (items: TemplateItem[]) =>
    [...items].sort((left, right) => right.updated_at.localeCompare(left.updated_at));

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

export const BrowserPreviewApi = {
    async getAll(limit?: number) {
        return sortItems(readPreviewItems()).slice(0, limit ?? 5000);
    },

    async getPage(page = 1, pageSize = 12, filters?: TemplateItemFilters): Promise<TemplateItemPage> {
        const normalized = normalizeFilters(filters);
        const filteredItems = sortItems(readPreviewItems()).filter(item => {
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
        const items = readPreviewItems();
        const timestamp = new Date().toISOString();
        const nextItem: TemplateItem = {
            id: globalThis.crypto?.randomUUID?.() ?? `preview-${Date.now()}`,
            title: data.title.trim(),
            summary: data.summary.trim(),
            status: data.status,
            created_at: timestamp,
            updated_at: timestamp,
        };

        writePreviewItems([nextItem, ...items]);
        return nextItem;
    },

    async update(id: string, data: UpdateTemplateItemInput) {
        const items = readPreviewItems();
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
        return nextItem;
    },

    async delete(id: string) {
        const items = readPreviewItems();
        writePreviewItems(items.filter(item => item.id !== id));
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
