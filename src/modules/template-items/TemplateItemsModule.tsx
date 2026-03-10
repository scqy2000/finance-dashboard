import { Plus, RefreshCcw } from 'lucide-react';
import { TemplateItemEditor } from './components/TemplateItemEditor';
import { TemplateItemsFilters } from './components/TemplateItemsFilters';
import { TemplateItemsList } from './components/TemplateItemsList';
import { templateItemsCopy } from './constants';
import { useTemplateItemsController } from './useTemplateItemsController';

export function TemplateItemsModule() {
    const controller = useTemplateItemsController();

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
                        className="btn-primary"
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
        </section>
    );
}
