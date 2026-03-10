import { Search } from 'lucide-react';
import type { TemplateItemFilters } from '../../../api/types';
import { templateItemStatusOptions } from '../constants';

type TemplateItemsFiltersProps = {
    filters: TemplateItemFilters;
    onChange: (filters: TemplateItemFilters) => void;
    onApply: () => Promise<void>;
};

export function TemplateItemsFilters({ filters, onChange, onApply }: TemplateItemsFiltersProps) {
    return (
        <article className="glass-panel p-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr,0.8fr,auto]">
                <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                    Search
                    <div className="flex items-center gap-3 rounded-[16px] border border-[var(--border-light)] bg-white/75 px-4 py-3">
                        <Search size={16} className="text-[var(--text-tertiary)]" />
                        <input
                            type="text"
                            value={filters.query ?? ''}
                            onChange={event => onChange({ ...filters, query: event.target.value })}
                            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                            placeholder="Search by title or summary"
                        />
                    </div>
                </label>

                <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                    Status
                    <select
                        value={filters.status ?? 'all'}
                        onChange={event => onChange({ ...filters, status: event.target.value as TemplateItemFilters['status'] })}
                        className="rounded-[16px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                    >
                        {templateItemStatusOptions.map(option => (
                            <option key={option.value} value={option.value ?? 'all'}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex items-end">
                    <button type="button" className="btn-primary w-full justify-center xl:w-auto" onClick={() => void onApply()}>
                        Apply filters
                    </button>
                </div>
            </div>
        </article>
    );
}
