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
    readonly stepTitleInput: Locator;
    readonly stepStatusSelect: Locator;
    readonly stepSaveButton: Locator;
    readonly selectAllCheckbox: Locator;

    constructor(page: Page) {
        this.page = page;
        this.itemsNavButton = page.getByTestId('nav-items');
        this.createButton = page.getByTestId('template-items-create-button');
        this.importButton = page.getByTestId('template-items-import-button');
        this.searchInput = page.getByTestId('template-items-search-input');
        this.titleInput = page.getByTestId('template-item-title-input');
        this.summaryInput = page.getByTestId('template-item-summary-input');
        this.statusSelect = page.getByTestId('template-item-status-select');
        this.stepTitleInput = page.getByTestId('template-item-step-title-input');
        this.stepStatusSelect = page.getByTestId('template-item-step-status-select');
        this.stepSaveButton = page.getByTestId('template-item-step-save-button');
        this.selectAllCheckbox = page.getByTestId('template-items-select-all');
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

    async openSteps(title: string) {
        const row = this.rowByTitle(title);
        await row.getByRole('button', { name: 'Steps' }).click();
        await expect(this.page.getByText(title).nth(1)).toBeVisible();
    }

    async addStep(title: string, status: 'pending' | 'done' = 'pending') {
        await this.stepTitleInput.fill(title);
        await this.stepStatusSelect.selectOption(status);
        await this.stepSaveButton.click();
        await expect(this.page.getByTestId('template-item-steps-list')).toContainText(title);
    }

    async expectStepSummary(summary: string) {
        await expect(this.page.getByTestId('template-item-steps-summary')).toHaveText(summary);
    }

    async closeSteps() {
        await this.page.getByRole('button', { name: 'Close' }).nth(0).click();
    }

    async expectRowSteps(title: string, summary: string) {
        await expect(this.rowByTitle(title).getByText(summary)).toBeVisible();
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
