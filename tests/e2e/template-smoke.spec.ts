import { expect, test } from '@playwright/test';
import { TemplateItemsPage } from './pages/TemplateItemsPage';

test.describe('template smoke flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
    });

    test('can switch pages and complete create/delete loop in browser preview mode', async ({ page }) => {
        const itemsPage = new TemplateItemsPage(page);
        const title = `Smoke item ${Date.now()}`;

        await itemsPage.goto();
        await expect(page.getByRole('heading', { name: 'Local-first desktop template' })).toBeVisible();

        await itemsPage.openItems();
        await itemsPage.createItem(title, 'Smoke summary for transplant validation.');
        await itemsPage.search(title);
        await expect(itemsPage.rowByTitle(title)).toBeVisible();
        await itemsPage.deleteItem(title);
        await expect(itemsPage.rowByTitle(title)).toHaveCount(0);
    });

    test('can import template items from csv in browser preview mode', async ({ page }) => {
        const itemsPage = new TemplateItemsPage(page);
        const importTitle = `Imported item ${Date.now()}`;

        await itemsPage.goto();
        await itemsPage.openItems();
        await itemsPage.importCsv(
            'template-items.csv',
            `title,summary,status\n${importTitle},Imported through csv,active`,
        );
        await itemsPage.search(importTitle);
        await expect(itemsPage.rowByTitle(importTitle)).toBeVisible();
    });

    test('can undo the last csv import in browser preview mode', async ({ page }) => {
        const itemsPage = new TemplateItemsPage(page);
        const importTitle = `Undo import ${Date.now()}`;

        await itemsPage.goto();
        await itemsPage.openItems();
        await itemsPage.importCsv(
            'template-items.csv',
            `title,summary,status\n${importTitle},Imported then rolled back,active`,
        );
        await itemsPage.expectImportUndoBanner();
        await itemsPage.search(importTitle);
        await expect(itemsPage.rowByTitle(importTitle)).toBeVisible();

        await itemsPage.undoLastImport();
        await expect(page.getByTestId('template-items-import-undo-banner')).toHaveCount(0);
        await expect(itemsPage.rowByTitle(importTitle)).toHaveCount(0);
    });

    test('can manage child steps and refresh parent aggregates in browser preview mode', async ({ page }) => {
        const itemsPage = new TemplateItemsPage(page);
        const itemTitle = `Parent item ${Date.now()}`;
        const stepTitle = `Child step ${Date.now()}`;

        await itemsPage.goto();
        await itemsPage.openItems();
        await itemsPage.createItem(itemTitle, 'Parent-child sample for transplant validation.');
        await itemsPage.search(itemTitle);
        await itemsPage.expectRowSteps(itemTitle, 'Steps 0/0 done');

        await itemsPage.openSteps(itemTitle);
        await itemsPage.addStep(stepTitle, 'done');
        await itemsPage.expectStepSummary('1/1 done');
        await itemsPage.closeSteps();

        await itemsPage.expectRowSteps(itemTitle, 'Steps 1/1 done');
    });

    test('can batch archive and batch delete selected items in browser preview mode', async ({ page }) => {
        const itemsPage = new TemplateItemsPage(page);
        const firstTitle = `Bulk item A ${Date.now()}`;
        const secondTitle = `Bulk item B ${Date.now()}`;

        await itemsPage.goto();
        await itemsPage.openItems();
        await itemsPage.createItem(firstTitle, 'First bulk item.');
        await itemsPage.createItem(secondTitle, 'Second bulk item.');
        await itemsPage.search('Bulk item');

        await itemsPage.selectItem(firstTitle);
        await itemsPage.selectItem(secondTitle);
        await expect(page.getByTestId('template-items-bulk-toolbar')).toContainText('2 selected');

        await itemsPage.bulkArchiveSelected();
        await itemsPage.expectRowStatus(firstTitle, 'archived');
        await itemsPage.expectRowStatus(secondTitle, 'archived');

        await itemsPage.bulkDeleteSelected();
        await expect(itemsPage.rowByTitle(firstTitle)).toHaveCount(0);
        await expect(itemsPage.rowByTitle(secondTitle)).toHaveCount(0);
    });
});
