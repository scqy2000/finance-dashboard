import { invoke } from '@tauri-apps/api/core';
import type {
    AppInfo,
    CreateTemplateItemInput,
    TemplateItem,
    TemplateItemFilters,
    TemplateItemPage,
    TemplateOverview,
    UpdateTemplateItemInput,
} from './types';

const normalizeFilters = (filters?: TemplateItemFilters) => ({
    query: filters?.query?.trim() || null,
    status: !filters?.status || filters.status === 'all' ? null : filters.status,
});

export const ItemsApi = {
    async getAll(limit?: number) {
        return invoke<TemplateItem[]>('get_template_items', { limit });
    },

    async getPage(page = 1, pageSize = 12, filters?: TemplateItemFilters) {
        const normalized = normalizeFilters(filters);
        return invoke<TemplateItemPage>('get_template_items_page', {
            page,
            pageSize,
            query: normalized.query,
            status: normalized.status,
        });
    },

    async create(data: CreateTemplateItemInput) {
        return invoke<TemplateItem>('create_template_item', { item: data });
    },

    async update(id: string, data: UpdateTemplateItemInput) {
        return invoke<TemplateItem>('update_template_item', { id, data });
    },

    async delete(id: string) {
        return invoke<void>('delete_template_item', { id });
    },
};

export const OverviewApi = {
    async get() {
        return invoke<TemplateOverview>('get_template_overview');
    },
};

export const AppSettingsApi = {
    async load(key: string) {
        return invoke<string | null>('load_app_setting', { key });
    },

    async save(key: string, value: string) {
        return invoke<void>('save_app_setting', { key, value });
    },

    async clear(key: string) {
        return invoke<void>('clear_app_setting', { key });
    },
};

export const SystemApi = {
    async getInfo() {
        return invoke<AppInfo>('get_app_info');
    },
};
