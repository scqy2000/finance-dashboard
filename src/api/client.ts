import { invoke } from '@tauri-apps/api/core';
import { BrowserPreviewApi, isBrowserPreview } from './browserPreview';
import type {
    AppInfo,
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

const normalizeFilters = (filters?: TemplateItemFilters) => ({
    query: filters?.query?.trim() || null,
    status: !filters?.status || filters.status === 'all' ? null : filters.status,
});

export const ItemsApi = {
    async getAll(limit?: number) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.getAll(limit);
        }
        return invoke<TemplateItem[]>('get_template_items', { limit });
    },

    async getPage(page = 1, pageSize = 12, filters?: TemplateItemFilters) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.getPage(page, pageSize, filters);
        }
        const normalized = normalizeFilters(filters);
        return invoke<TemplateItemPage>('get_template_items_page', {
            page,
            pageSize,
            query: normalized.query,
            status: normalized.status,
        });
    },

    async create(data: CreateTemplateItemInput) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.create(data);
        }
        return invoke<TemplateItem>('create_template_item', { item: data });
    },

    async update(id: string, data: UpdateTemplateItemInput) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.update(id, data);
        }
        return invoke<TemplateItem>('update_template_item', { id, data });
    },

    async delete(id: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.delete(id);
        }
        return invoke<void>('delete_template_item', { id });
    },

    async getSteps(itemId: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.getSteps(itemId);
        }
        return invoke<TemplateItemStep[]>('get_template_item_steps', { itemId });
    },

    async createStep(itemId: string, step: CreateTemplateItemStepInput) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.createStep(itemId, step);
        }
        return invoke<TemplateItemStep>('create_template_item_step', { itemId, step });
    },

    async updateStep(id: string, data: UpdateTemplateItemStepInput) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.updateStep(id, data);
        }
        return invoke<TemplateItemStep>('update_template_item_step', { id, data });
    },

    async deleteStep(id: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.deleteStep(id);
        }
        return invoke<void>('delete_template_item_step', { id });
    },
};

export const OverviewApi = {
    async get() {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.getOverview();
        }
        return invoke<TemplateOverview>('get_template_overview');
    },
};

export const AppSettingsApi = {
    async load(key: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.loadSetting(key);
        }
        return invoke<string | null>('load_app_setting', { key });
    },

    async save(key: string, value: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.saveSetting(key, value);
        }
        return invoke<void>('save_app_setting', { key, value });
    },

    async clear(key: string) {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.clearSetting(key);
        }
        return invoke<void>('clear_app_setting', { key });
    },
};

export const SystemApi = {
    async getInfo() {
        if (isBrowserPreview()) {
            return BrowserPreviewApi.getInfo();
        }
        return invoke<AppInfo>('get_app_info');
    },
};
