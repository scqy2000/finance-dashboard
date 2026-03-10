import { useEffect, useMemo, useState } from 'react';
import type { CreateTemplateItemInput, TemplateItem } from '../api/types';

type ItemModalProps = {
    isOpen: boolean;
    item: TemplateItem | null;
    onClose: () => void;
    onSave: (data: CreateTemplateItemInput) => Promise<void>;
};

const defaultForm: CreateTemplateItemInput = {
    title: '',
    summary: '',
    status: 'draft',
};

export function ItemModal({ isOpen, item, onClose, onSave }: ItemModalProps) {
    const [form, setForm] = useState<CreateTemplateItemInput>(defaultForm);
    const [saving, setSaving] = useState(false);
    const isEditing = useMemo(() => Boolean(item), [item]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (item) {
            setForm({
                title: item.title,
                summary: item.summary,
                status: item.status,
            });
            return;
        }

        setForm(defaultForm);
    }, [isOpen, item]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const title = form.title.trim();

        if (!title || saving) {
            return;
        }

        setSaving(true);
        try {
            await onSave({
                title,
                summary: form.summary.trim(),
                status: form.status,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="motion-overlay-fade fixed inset-0 z-[2200] bg-black/35 backdrop-blur-[3px] flex items-center justify-center px-4">
            <div className="glass-panel motion-panel-slide w-full max-w-[560px] p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                            Example entity
                        </div>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                            {isEditing ? 'Edit template item' : 'Create template item'}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            This is the minimal CRUD form kept in template core. Replace fields, keep the flow.
                        </p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>

                <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                    <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                        Title
                        <input
                            type="text"
                            value={form.title}
                            onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                            className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            maxLength={120}
                            placeholder="Example: Ship a project workspace shell"
                            autoFocus
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                        Summary
                        <textarea
                            value={form.summary}
                            onChange={event => setForm(prev => ({ ...prev, summary: event.target.value }))}
                            className="min-h-[120px] rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            placeholder="Document what this record represents in the target app."
                            maxLength={1000}
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                        Status
                        <select
                            value={form.status}
                            onChange={event => setForm(prev => ({ ...prev, status: event.target.value as CreateTemplateItemInput['status'] }))}
                            className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                        >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
                            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
