import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleDashed, PencilLine, Trash2 } from 'lucide-react';
import { ItemsApi } from '../../../api/client';
import type { CreateTemplateItemStepInput, TemplateItem, TemplateItemStatus, TemplateItemStep } from '../../../api/types';
import { useFeedback } from '../../../components/ui/FeedbackProvider';
import { getErrorMessage } from '../../../utils/errors';
import { templateItemStatusBadgeMap, templateItemStepStatusBadgeMap } from '../constants';

type TemplateItemDetailViewProps = {
    itemId: string;
    refreshNonce: number;
    onBack: () => void;
    onEdit: (item: TemplateItem) => void;
    onDeleted: () => void;
    onRefreshParent: () => Promise<void>;
};

const defaultStepForm: CreateTemplateItemStepInput = {
    title: '',
    status: 'pending',
};

const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
};

export function TemplateItemDetailView({ itemId, refreshNonce, onBack, onEdit, onDeleted, onRefreshParent }: TemplateItemDetailViewProps) {
    const { toast, confirm } = useFeedback();
    const [item, setItem] = useState<TemplateItem | null>(null);
    const [steps, setSteps] = useState<TemplateItemStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [itemActionLoading, setItemActionLoading] = useState(false);
    const [stepSaving, setStepSaving] = useState(false);
    const [stepForm, setStepForm] = useState<CreateTemplateItemStepInput>(defaultStepForm);
    const [editingStep, setEditingStep] = useState<TemplateItemStep | null>(null);

    const loadDetail = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [nextItem, nextSteps] = await Promise.all([
                ItemsApi.getById(itemId),
                ItemsApi.getSteps(itemId),
            ]);
            setItem(nextItem);
            setSteps(nextSteps);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Failed to load item detail'));
        } finally {
            setLoading(false);
        }
    }, [itemId]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail, refreshNonce]);

    const stepProgress = useMemo(() => {
        const total = steps.length;
        const completed = steps.filter(step => step.status === 'done').length;
        return { total, completed };
    }, [steps]);

    const refreshAfterChildWrite = async () => {
        await Promise.all([loadDetail(), onRefreshParent()]);
    };

    const handleStatusChange = async (status: TemplateItemStatus) => {
        if (!item || item.status === status) {
            return;
        }

        setItemActionLoading(true);
        try {
            const updated = await ItemsApi.update(item.id, { status });
            setItem(updated);
            toast(`Item moved to ${status}.`, 'success');
            await onRefreshParent();
        } catch (updateError) {
            toast(getErrorMessage(updateError, 'Failed to update item status'), 'error');
        } finally {
            setItemActionLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!item) {
            return;
        }

        const accepted = await confirm('Delete item', `Delete "${item.title}" and all child steps?`);
        if (!accepted) {
            return;
        }

        setItemActionLoading(true);
        try {
            await ItemsApi.delete(item.id);
            await onRefreshParent();
            toast('Item deleted.', 'success');
            onDeleted();
        } catch (deleteError) {
            toast(getErrorMessage(deleteError, 'Failed to delete item'), 'error');
        } finally {
            setItemActionLoading(false);
        }
    };

    const handleSubmitStep = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!item || !stepForm.title.trim() || stepSaving) {
            return;
        }

        setStepSaving(true);
        try {
            if (editingStep) {
                await ItemsApi.updateStep(editingStep.id, {
                    title: stepForm.title.trim(),
                    status: stepForm.status,
                });
                toast('Step updated.', 'success');
            } else {
                await ItemsApi.createStep(item.id, {
                    title: stepForm.title.trim(),
                    status: stepForm.status,
                });
                toast('Step created.', 'success');
            }

            setEditingStep(null);
            setStepForm(defaultStepForm);
            await refreshAfterChildWrite();
        } catch (stepError) {
            toast(getErrorMessage(stepError, 'Failed to save step'), 'error');
        } finally {
            setStepSaving(false);
        }
    };

    const handleToggleStep = async (step: TemplateItemStep) => {
        try {
            await ItemsApi.updateStep(step.id, {
                status: step.status === 'done' ? 'pending' : 'done',
            });
            toast(step.status === 'done' ? 'Step moved back to pending.' : 'Step marked done.', 'success');
            await refreshAfterChildWrite();
        } catch (stepError) {
            toast(getErrorMessage(stepError, 'Failed to update step status'), 'error');
        }
    };

    const handleDeleteStep = async (step: TemplateItemStep) => {
        const accepted = await confirm('Delete step', `Delete "${step.title}"?`);
        if (!accepted) {
            return;
        }

        try {
            await ItemsApi.deleteStep(step.id);
            if (editingStep?.id === step.id) {
                setEditingStep(null);
                setStepForm(defaultStepForm);
            }
            toast('Step deleted.', 'success');
            await refreshAfterChildWrite();
        } catch (stepError) {
            toast(getErrorMessage(stepError, 'Failed to delete step'), 'error');
        }
    };

    const startEditingStep = (step: TemplateItemStep) => {
        setEditingStep(step);
        setStepForm({
            title: step.title,
            status: step.status,
        });
    };

    if (loading) {
        return <div className="glass-panel px-6 py-10 text-sm text-[var(--text-secondary)]">Loading detail...</div>;
    }

    if (!item) {
        return (
            <div className="glass-panel flex flex-col gap-4 px-6 py-10">
                <div className="text-base font-semibold text-[var(--text-primary)]">Detail unavailable</div>
                <div className="text-sm text-[var(--color-danger)]">{error || 'The selected item no longer exists.'}</div>
                <div>
                    <button type="button" className="btn-secondary" onClick={onBack}>
                        Back to list
                    </button>
                </div>
            </div>
        );
    }

    const badgeClass = templateItemStatusBadgeMap[item.status];

    return (
        <section className="flex flex-col gap-6" data-testid="template-item-detail-view">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <button type="button" className="btn-secondary" data-testid="template-item-detail-back" onClick={onBack}>
                        <ArrowLeft size={16} />
                        Back to list
                    </button>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{item.title}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${badgeClass}`}>
                            {item.status}
                        </span>
                    </div>
                    <p className="mt-3 max-w-[800px] whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                        {item.summary || 'No summary provided.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-tertiary)]">
                        <span>Created {formatDate(item.created_at)}</span>
                        <span>Updated {formatDate(item.updated_at)}</span>
                        <span className="break-all">ID {item.id}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 xl:justify-end">
                    <button type="button" className="btn-secondary" data-testid="template-item-detail-edit" onClick={() => onEdit(item)}>
                        <PencilLine size={16} />
                        Edit
                    </button>
                    <button type="button" className="btn-secondary" data-testid="template-item-detail-delete" onClick={() => void handleDeleteItem()} disabled={itemActionLoading}>
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <article className="glass-panel p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Status</div>
                    <div className="mt-3 text-lg font-semibold text-[var(--text-primary)] capitalize">{item.status}</div>
                </article>
                <article className="glass-panel p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Step progress</div>
                    <div className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{stepProgress.completed}/{stepProgress.total} done</div>
                </article>
                <article className="glass-panel p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Created</div>
                    <div className="mt-3 text-sm font-medium text-[var(--text-primary)]">{formatDate(item.created_at)}</div>
                </article>
                <article className="glass-panel p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Updated</div>
                    <div className="mt-3 text-sm font-medium text-[var(--text-primary)]">{formatDate(item.updated_at)}</div>
                </article>
            </div>

            <article className="glass-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">Quick status</div>
                        <div className="text-xs text-[var(--text-secondary)]">Use the same item contract from list pages inside a detail surface.</div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn-secondary" data-testid="template-item-detail-status-draft" disabled={itemActionLoading || item.status === 'draft'} onClick={() => void handleStatusChange('draft')}>
                            Draft
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-item-detail-status-active" disabled={itemActionLoading || item.status === 'active'} onClick={() => void handleStatusChange('active')}>
                            Active
                        </button>
                        <button type="button" className="btn-secondary" data-testid="template-item-detail-status-archived" disabled={itemActionLoading || item.status === 'archived'} onClick={() => void handleStatusChange('archived')}>
                            Archived
                        </button>
                    </div>
                </div>
            </article>

            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <form className="glass-panel p-5" onSubmit={handleSubmitStep}>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{editingStep ? 'Edit child step' : 'Add child step'}</div>
                    <div className="mt-4 flex flex-col gap-4">
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            Title
                            <input
                                type="text"
                                data-testid="template-item-detail-step-title"
                                value={stepForm.title}
                                onChange={event => setStepForm(prev => ({ ...prev, title: event.target.value }))}
                                className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                placeholder="Example: Validate a nested workflow"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            Status
                            <select
                                data-testid="template-item-detail-step-status"
                                value={stepForm.status}
                                onChange={event => setStepForm(prev => ({ ...prev, status: event.target.value as CreateTemplateItemStepInput['status'] }))}
                                className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            >
                                <option value="pending">Pending</option>
                                <option value="done">Done</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="submit" className="btn-primary" data-testid="template-item-detail-step-save" disabled={stepSaving || !stepForm.title.trim()}>
                            {stepSaving ? 'Saving...' : editingStep ? 'Save step' : 'Add step'}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setEditingStep(null);
                                setStepForm(defaultStepForm);
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </form>

                <article className="glass-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">Child steps</div>
                            <div className="text-xs text-[var(--text-secondary)]">This is the reusable parent-child detail sample for local-first apps.</div>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]" data-testid="template-item-detail-step-summary">
                            {stepProgress.completed}/{stepProgress.total} done
                        </div>
                    </div>

                    {steps.length === 0 ? (
                        <div className="mt-6 text-sm leading-6 text-[var(--text-secondary)]">No child steps yet. Add one from the form on the left.</div>
                    ) : (
                        <div className="mt-5 flex flex-col divide-y divide-[var(--border-light)]" data-testid="template-item-detail-step-list">
                            {steps.map(step => (
                                <div key={step.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${templateItemStepStatusBadgeMap[step.status]}`}>
                                                {step.status}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-[var(--text-tertiary)]">Updated {formatDate(step.updated_at)}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 md:shrink-0">
                                        <button type="button" className="btn-secondary" data-testid={`template-item-detail-step-toggle-${step.id}`} onClick={() => void handleToggleStep(step)}>
                                            {step.status === 'done' ? (
                                                <>
                                                    <CircleDashed size={16} />
                                                    Mark pending
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    Mark done
                                                </>
                                            )}
                                        </button>
                                        <button type="button" className="btn-secondary" data-testid={`template-item-detail-step-edit-${step.id}`} onClick={() => startEditingStep(step)}>
                                            Edit
                                        </button>
                                        <button type="button" className="btn-secondary" data-testid={`template-item-detail-step-delete-${step.id}`} onClick={() => void handleDeleteStep(step)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </div>
        </section>
    );
}
