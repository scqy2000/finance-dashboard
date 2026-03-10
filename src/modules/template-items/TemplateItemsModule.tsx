import { useState } from 'react';
import { Download, FileDown, Plus, RefreshCcw, Upload } from 'lucide-react';
import type { TemplateItem } from '../../api/types';
import { ItemsApi } from '../../api/client';
import { downloadTemplateItemsCsv, downloadTemplateItemsCsvSample } from './export/csv';
import { TemplateItemEditor } from './components/TemplateItemEditor';
import { TemplateItemStepsModal } from './components/TemplateItemStepsModal';
import { TemplateItemsFilters } from './components/TemplateItemsFilters';
import { TemplateItemsImportModal } from './components/TemplateItemsImportModal';
import { TemplateItemsList } from './components/TemplateItemsList';
import { templateItemsCopy } from './constants';
import { useTemplateItemsController } from './useTemplateItemsController';

export function TemplateItemsModule() {
    const controller = useTemplateItemsController();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [stepsItem, setStepsItem] = useState<TemplateItem | null>(null);

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{templateItemsCopy.eyebrow}</div>
                    <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">{templateItemsCopy.title}</h1>
                    <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[var(--text-secondary)]">
                        {templateItemsCopy.description}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn-secondary" onClick={() => void controller.refreshPage()}>
                        <RefreshCcw size={16} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                            const items = await ItemsApi.getAll(5000);
                            downloadTemplateItemsCsv(items);
                        }}
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                    <button type="button" className="btn-secondary" onClick={downloadTemplateItemsCsvSample}>
                        <FileDown size={16} />
                        Download sample
                    </button>
                    <button type="button" className="btn-secondary" data-testid="template-items-import-button" onClick={() => setIsImportOpen(true)}>
                        <Upload size={16} />
                        Import CSV
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        data-testid="template-items-create-button"
                        onClick={() => {
                            controller.setEditingItem(null);
                            controller.setIsModalOpen(true);
                        }}
                    >
                        <Plus size={16} />
                        New item
                    </button>
                </div>
            </header>

            <TemplateItemsFilters
                filters={controller.draftFilters}
                onChange={controller.setDraftFilters}
                onApply={controller.handleApplyFilters}
            />

            <TemplateItemsList
                itemsPage={controller.itemsPage}
                itemsLoading={controller.itemsLoading}
                itemsError={controller.itemsError}
                currentPageSize={controller.currentPageSize}
                emptyStateMessage={controller.emptyStateMessage}
                onEdit={item => {
                    controller.setEditingItem(item);
                    controller.setIsModalOpen(true);
                }}
                onOpenSteps={item => setStepsItem(item)}
                onDelete={controller.handleDelete}
                onPreviousPage={controller.goToPreviousPage}
                onNextPage={controller.goToNextPage}
            />

            <TemplateItemEditor
                isOpen={controller.isModalOpen}
                item={controller.editingItem}
                onClose={() => {
                    controller.setIsModalOpen(false);
                    controller.setEditingItem(null);
                }}
                onSave={controller.handleSaveItem}
            />

            <TemplateItemStepsModal
                isOpen={Boolean(stepsItem)}
                item={stepsItem}
                onClose={() => setStepsItem(null)}
                onRefreshParent={controller.refreshPage}
            />

            <TemplateItemsImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={controller.handleImportRows}
            />
        </section>
    );
}
