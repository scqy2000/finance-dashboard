import { useState } from 'react';
import { Archive, Download, FileDown, History, Plus, RefreshCcw, Trash2, Upload, X } from 'lucide-react';
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

function formatImportTime(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleTimeString();
}

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

            {controller.lastImportBatch && (
                <article className="glass-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" data-testid="template-items-import-undo-banner">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            <History size={16} />
                            Last import ready to undo
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                            {controller.lastImportBatch.count} items imported at {formatImportTime(controller.lastImportBatch.createdAt)}. Any other write clears this rollback handle.
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn-secondary" data-testid="template-items-undo-import" onClick={() => void controller.handleUndoLastImport()}>
                            <History size={16} />
                            Undo import
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-items-dismiss-import-undo" onClick={controller.clearLastImportBatch}>
                            <X size={16} />
                            Dismiss
                        </button>
                    </div>
                </article>
            )}

            {controller.selectedItems.length > 0 && (
                <article className="glass-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" data-testid="template-items-bulk-toolbar">
                    <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{controller.selectedItems.length} selected</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                            Use this as the template reference for batch state changes and transactional batch delete.
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn-secondary" data-testid="template-items-bulk-active" onClick={() => void controller.handleBulkStatusUpdate('active')}>
                            Active
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-items-bulk-archive" onClick={() => void controller.handleBulkStatusUpdate('archived')}>
                            <Archive size={16} />
                            Archive
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-items-bulk-draft" onClick={() => void controller.handleBulkStatusUpdate('draft')}>
                            Draft
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-items-bulk-clear" onClick={() => controller.setSelectedItemIds([])}>
                            Clear
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-items-bulk-delete" onClick={() => void controller.handleBulkDelete()}>
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>
                </article>
            )}

            <TemplateItemsList
                itemsPage={controller.itemsPage}
                itemsLoading={controller.itemsLoading}
                itemsError={controller.itemsError}
                currentPageSize={controller.currentPageSize}
                emptyStateMessage={controller.emptyStateMessage}
                selectedItemIds={controller.selectedItemIds}
                allVisibleSelected={controller.allVisibleSelected}
                onToggleSelected={controller.toggleSelectedItem}
                onToggleSelectAllVisible={controller.toggleSelectAllVisible}
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
