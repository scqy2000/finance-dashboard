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
});
