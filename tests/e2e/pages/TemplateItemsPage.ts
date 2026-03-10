import { expect, type Locator, type Page } from '@playwright/test';

export class TemplateItemsPage {
    readonly page: Page;
    readonly itemsNavButton: Locator;
    readonly createButton: Locator;
    readonly importButton: Locator;
    readonly searchInput: Locator;
    readonly titleInput: Locator;
    readonly summaryInput: Locator;
    readonly statusSelect: Locator;
    readonly selectAllCheckbox: Locator;
    readonly detailStepTitleInput: Locator;
    readonly detailStepStatusSelect: Locator;
    readonly detailStepSaveButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.itemsNavButton = page.getByTestId('nav-items');
        this.createButton = page.getByTestId('template-items-create-button');
        this.importButton = page.getByTestId('template-items-import-button');
        this.searchInput = page.getByTestId('template-items-search-input');
        this.titleInput = page.getByTestId('template-item-title-input');
        this.summaryInput = page.getByTestId('template-item-summary-input');
        this.statusSelect = page.getByTestId('template-item-status-select');
        this.selectAllCheckbox = page.getByTestId('template-items-select-all');
        this.detailStepTitleInput = page.getByTestId('template-item-detail-step-title');
        this.detailStepStatusSelect = page.getByTestId('template-item-detail-step-status');
        this.detailStepSaveButton = page.getByTestId('template-item-detail-step-save');
    }

    async goto() {
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
    }

    async openItems() {
        await this.itemsNavButton.click();
        await expect(this.page.getByRole('heading', { name: 'Items' })).toBeVisible();
    }

    async createItem(title: string, summary: string, status: 'draft' | 'active' | 'archived' = 'active') {
        await this.createButton.click();
        await this.titleInput.fill(title);
        await this.summaryInput.fill(summary);
        await this.statusSelect.selectOption(status);
        await this.page.getByRole('button', { name: 'Create item' }).click();
        await expect(this.rowByTitle(title)).toBeVisible();
    }

    async search(query: string) {
        await this.searchInput.fill(query);
        await this.page.getByRole('button', { name: 'Apply filters' }).click();
        await this.page.waitForLoadState('networkidle');
    }

    rowByTitle(title: string) {
        return this.page.locator('[data-testid^="template-item-row-"]').filter({ hasText: title }).first();
    }

    async importCsv(name: string, content: string) {
        await this.importButton.click();
        await this.page.getByTestId('template-items-import-file-input').setInputFiles({
            name,
            mimeType: 'text/csv',
            buffer: Buffer.from(content),
        });
        await this.page.getByTestId('template-items-import-submit').click();
        await expect(this.page.getByRole('button', { name: 'Done' })).toBeVisible();
        await this.page.getByRole('button', { name: 'Done' }).click();
    }

    async openDetail(title: string) {
        const row = this.rowByTitle(title);
        await row.getByRole('button', { name: 'Open' }).click();
        await expect(this.page.getByTestId('template-item-detail-view')).toBeVisible();
        await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
    }

    async goBackFromDetail() {
        await this.page.getByTestId('template-item-detail-back').click();
        await expect(this.page.getByTestId('template-items-list')).toBeVisible();
    }

    async addStepInDetail(title: string, status: 'pending' | 'done' = 'pending') {
        await this.detailStepTitleInput.fill(title);
        await this.detailStepStatusSelect.selectOption(status);
        await this.detailStepSaveButton.click();
        await expect(this.page.getByTestId('template-item-detail-step-list')).toContainText(title);
    }

    async expectDetailStepSummary(summary: string) {
        await expect(this.page.getByTestId('template-item-detail-step-summary')).toHaveText(summary);
    }

    async setDetailStatus(status: 'draft' | 'active' | 'archived') {
        await this.page.getByTestId(`template-item-detail-status-${status}`).click();
    }

    async selectItem(title: string) {
        await this.rowByTitle(title).locator('[data-testid^="template-item-select-"]').check();
    }

    async bulkArchiveSelected() {
        await this.page.getByTestId('template-items-bulk-archive').click();
    }

    async bulkDeleteSelected() {
        await this.page.getByTestId('template-items-bulk-delete').click();
        await this.page.getByTestId('confirm-accept').click();
    }

    async undoLastImport() {
        await this.page.getByTestId('template-items-undo-import').click();
        await this.page.getByTestId('confirm-accept').click();
    }

    async expectImportUndoBanner() {
        await expect(this.page.getByTestId('template-items-import-undo-banner')).toBeVisible();
    }

    async expectRowSteps(title: string, summary: string) {
        await expect(this.rowByTitle(title).getByText(summary)).toBeVisible();
    }

    async expectRowStatus(title: string, status: 'draft' | 'active' | 'archived') {
        await expect(this.rowByTitle(title).getByText(status, { exact: true })).toBeVisible();
    }

    async deleteItem(title: string) {
        const row = this.rowByTitle(title);
        await row.getByRole('button', { name: 'Delete' }).click();
        await this.page.getByTestId('confirm-accept').click();
        await expect(row).toHaveCount(0);
    }
}
