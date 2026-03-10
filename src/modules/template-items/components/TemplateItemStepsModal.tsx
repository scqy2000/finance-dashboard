import { useEffect, useMemo, useState } from 'react';
import { ItemsApi } from '../../../api/client';
import type {
    CreateTemplateItemStepInput,
    TemplateItem,
    TemplateItemStep,
    UpdateTemplateItemStepInput,
} from '../../../api/types';
import { useFeedback } from '../../../components/ui/FeedbackProvider';
import { getErrorMessage } from '../../../utils/errors';
import { templateItemStepStatusBadgeMap, templateItemsCopy } from '../constants';

type TemplateItemStepsModalProps = {
    isOpen: boolean;
    item: TemplateItem | null;
    onClose: () => void;
    onRefreshParent: () => Promise<void>;
};

const defaultForm: CreateTemplateItemStepInput = {
    title: '',
    status: 'pending',
};

export function TemplateItemStepsModal({ isOpen, item, onClose, onRefreshParent }: TemplateItemStepsModalProps) {
    const { toast, confirm } = useFeedback();
    const [steps, setSteps] = useState<TemplateItemStep[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CreateTemplateItemStepInput>(defaultForm);
    const [editingStep, setEditingStep] = useState<TemplateItemStep | null>(null);

    const derivedStats = useMemo(
        () => ({
            total: steps.length,
            done: steps.filter(step => step.status === 'done').length,
        }),
        [steps],
    );

    useEffect(() => {
        if (!isOpen || !item) {
            return;
        }

        void loadSteps(item.id);
        setEditingStep(null);
        setForm(defaultForm);
    }, [isOpen, item?.id]);

    if (!isOpen || !item) {
        return null;
    }

    const activeItem = item;

    async function loadSteps(itemId: string) {
        setLoading(true);
        try {
            const nextSteps = await ItemsApi.getSteps(itemId);
            setSteps(nextSteps);
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to load steps'), 'error');
        } finally {
            setLoading(false);
        }
    }

    async function refreshAfterMutation() {
        await Promise.all([loadSteps(activeItem.id), onRefreshParent()]);
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const title = form.title.trim();
        if (!title || saving) {
            return;
        }

        setSaving(true);
        try {
            if (editingStep) {
                const update: UpdateTemplateItemStepInput = {
                    title,
                    status: form.status,
                };
                await ItemsApi.updateStep(editingStep.id, update);
                toast('Step updated.', 'success');
            } else {
                await ItemsApi.createStep(activeItem.id, {
                    title,
                    status: form.status,
                });
                toast('Step created.', 'success');
            }

            setEditingStep(null);
            setForm(defaultForm);
            await refreshAfterMutation();
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to save step'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (step: TemplateItemStep) => {
        const accepted = await confirm('Delete step', `Delete "${step.title}" from "${activeItem.title}"?`);
        if (!accepted) {
            return;
        }

        try {
            await ItemsApi.deleteStep(step.id);
            if (editingStep?.id === step.id) {
                setEditingStep(null);
                setForm(defaultForm);
            }
            toast('Step deleted.', 'success');
            await refreshAfterMutation();
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to delete step'), 'error');
        }
    };

    const handleToggleStatus = async (step: TemplateItemStep) => {
        try {
            await ItemsApi.updateStep(step.id, {
                status: step.status === 'done' ? 'pending' : 'done',
            });
            toast(step.status === 'done' ? 'Step moved back to pending.' : 'Step marked done.', 'success');
            await refreshAfterMutation();
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to update step status'), 'error');
        }
    };

    const startEditing = (step: TemplateItemStep) => {
        setEditingStep(step);
        setForm({
            title: step.title,
            status: step.status,
        });
    };

    return (
        <div className="motion-overlay-fade fixed inset-0 z-[2250] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[3px]">
            <div className="glass-panel motion-panel-slide flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-light)] px-6 py-5">
                    <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{templateItemsCopy.stepsTitle}</div>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{activeItem.title}</h2>
                        <p className="mt-2 max-w-[640px] text-sm text-[var(--text-secondary)]">{templateItemsCopy.stepsDescription}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--text-tertiary)]">
                            <span data-testid="template-item-steps-summary">{derivedStats.done}/{derivedStats.total} done</span>
                            <span>Parent aggregates refresh after each child write.</span>
                        </div>
                    </div>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <form className="border-b border-[var(--border-light)] px-6 py-5 lg:border-r lg:border-b-0" onSubmit={handleSubmit}>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {editingStep ? 'Edit step' : 'Add step'}
                        </div>
                        <div className="mt-4 flex flex-col gap-4">
                            <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                                Title
                                <input
                                    type="text"
                                    data-testid="template-item-step-title-input"
                                    value={form.title}
                                    onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                                    className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                    placeholder="Example: Create the first child workflow"
                                    maxLength={160}
                                    autoFocus
                                />
                            </label>

                            <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                                Status
                                <select
                                    data-testid="template-item-step-status-select"
                                    value={form.status}
                                    onChange={event =>
                                        setForm(prev => ({
                                            ...prev,
                                            status: event.target.value as CreateTemplateItemStepInput['status'],
                                        }))
                                    }
                                    className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="done">Done</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="submit"
                                className="btn-primary"
                                data-testid="template-item-step-save-button"
                                disabled={saving || !form.title.trim()}
                            >
                                {saving ? 'Saving...' : editingStep ? 'Save step' : 'Add step'}
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={saving || (!editingStep && !form.title)}
                                onClick={() => {
                                    setEditingStep(null);
                                    setForm(defaultForm);
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    </form>

                    <div className="flex min-h-[320px] flex-col px-6 py-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">Child records</div>
                                <div className="text-xs text-[var(--text-secondary)]">Ordered by status, then latest update.</div>
                            </div>
                            <button type="button" className="btn-secondary" onClick={() => void loadSteps(activeItem.id)} disabled={loading}>
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-8 text-sm text-[var(--text-secondary)]">Loading steps...</div>
                        ) : steps.length === 0 ? (
                            <div className="py-8 text-sm leading-6 text-[var(--text-secondary)]">
                                This parent record has no child steps yet. Add one to validate transactional writes and aggregate refresh.
                            </div>
                        ) : (
                            <div className="mt-4 flex flex-col divide-y divide-[var(--border-light)]" data-testid="template-item-steps-list">
                                {steps.map(step => (
                                    <div key={step.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${templateItemStepStatusBadgeMap[step.status]}`}>
                                                    {step.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-[var(--text-tertiary)]">Updated {new Date(step.updated_at).toLocaleString()}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-3 md:shrink-0">
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                data-testid={`template-item-step-toggle-${step.id}`}
                                                onClick={() => void handleToggleStatus(step)}
                                            >
                                                {step.status === 'done' ? 'Mark pending' : 'Mark done'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                data-testid={`template-item-step-edit-${step.id}`}
                                                onClick={() => startEditing(step)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                data-testid={`template-item-step-delete-${step.id}`}
                                                onClick={() => void handleDelete(step)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
