export type TemplateItemStatus = 'draft' | 'active' | 'archived';

export interface TemplateItem {
    id: string;
    title: string;
    summary: string;
    status: TemplateItemStatus;
    created_at: string;
    updated_at: string;
    total_steps?: number;
    completed_steps?: number;
}

export type TemplateItemStepStatus = 'pending' | 'done';

export interface TemplateItemStep {
    id: string;
    item_id: string;
    title: string;
    status: TemplateItemStepStatus;
    created_at: string;
    updated_at: string;
}

export interface TemplateItemFilters {
    query?: string;
    status?: TemplateItemStatus | 'all';
}

export interface TemplateItemPage {
    items: TemplateItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
}

export interface TemplateOverview {
    total_items: number;
    active_items: number;
    archived_items: number;
    draft_items: number;
}

export interface CreateTemplateItemInput {
    title: string;
    summary: string;
    status: TemplateItemStatus;
}

export interface UpdateTemplateItemInput {
    title?: string;
    summary?: string;
    status?: TemplateItemStatus;
}

export interface CreateTemplateItemStepInput {
    title: string;
    status: TemplateItemStepStatus;
}

export interface UpdateTemplateItemStepInput {
    title?: string;
    status?: TemplateItemStepStatus;
}

export interface BulkTemplateItemsInput {
    ids: string[];
}

export interface BulkUpdateTemplateItemStatusInput extends BulkTemplateItemsInput {
    status: TemplateItemStatus;
}

export interface ImportFailure<T> {
    index: number;
    reason: string;
    row?: T;
    raw?: string[];
}

export interface ImportResult<T> {
    success: number;
    failed: number;
    failedRows?: Array<ImportFailure<T>>;
}

export interface AppInfo {
    version: string;
    userData: string;
    isPackaged: boolean;
}

export interface TemplateAppSnapshot {
    exported_at: string;
    items: Array<CreateTemplateItemInput & { steps?: CreateTemplateItemStepInput[] }>;
    workspace_note: string;
    appearance: {
        appName: string;
        appShortName: string;
        themeColor: string;
        backgroundStyle: string;
    };
}
