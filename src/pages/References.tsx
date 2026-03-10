const referenceGroups = [
    {
        title: 'Directly reuse',
        items: [
            'Tauri + React + Rust + SQLite project wiring',
            'Theme tokens, title bar shell and feedback provider',
            'Zustand init/refreshAll store contract',
            'SQLite user_version migration pattern',
        ],
    },
    {
        title: 'Reuse after adaptation',
        items: [
            'CSV import and export flows',
            'Paginated and filterable list views',
            'AI chat context assembly and streaming UI',
            'Cross-table transaction orchestration',
        ],
    },
    {
        title: 'Do not reuse blindly',
        items: [
            'Finance-specific schema, naming and copy',
            'Any local secret storage strategy as a general security template',
            'Monolithic command files that mix unrelated domains',
        ],
    },
];

const sourcePaths = [
    'reference/finance-dashboard-src',
    'reference/finance-dashboard-src-tauri',
    'docs/reference-map.md',
    'docs/reference-index.md',
    'docs/template-items-module.md',
    'docs/transplant-playbook.md',
];

const themedReferenceGroups = [
    {
        title: 'Shell and feedback',
        description: 'Layout shell, navigation, title bar rhythm, feedback provider and settings surfaces.',
        paths: [
            'reference/finance-dashboard-src/App.tsx',
            'reference/finance-dashboard-src/components/Sidebar.tsx',
            'reference/finance-dashboard-src/components/ui/FeedbackProvider.tsx',
        ],
    },
    {
        title: 'Import and list workflows',
        description: 'Higher-complexity list pages, action menus and CSV parsing flows.',
        paths: [
            'reference/finance-dashboard-src/pages/Transactions.tsx',
            'reference/finance-dashboard-src/components/CsvImportModal.tsx',
            'reference/finance-dashboard-src/components/csv/parser.ts',
        ],
    },
    {
        title: 'Backend orchestration',
        description: 'Migration history, multi-entity writes and the old command organization.',
        paths: [
            'reference/finance-dashboard-src-tauri/commands.rs',
            'reference/finance-dashboard-src-tauri/db.rs',
            'reference/finance-dashboard-src-tauri/lib.rs',
        ],
    },
];

export function References() {
    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
                <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Reference map</div>
                <h1 className="text-4xl font-semibold tracking-[-0.03em]">What this template keeps, and what it only points to</h1>
                <p className="max-w-[780px] text-[15px] leading-7 text-[var(--text-secondary)]">
                    The original finance codebase is still in the repository as reference material. It is outside the runtime
                    core so new projects can study it without inheriting its domain model.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {referenceGroups.map(group => (
                    <article key={group.title} className="glass-panel p-5">
                        <h2 className="text-lg font-semibold">{group.title}</h2>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {group.items.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>

            <article className="glass-panel p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Files to inspect</div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {sourcePaths.map(path => (
                        <div key={path} className="rounded-[16px] border border-[var(--border-light)] bg-white/60 px-4 py-3">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{path}</div>
                            <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                                Keep this removable. Template core should still run if reference material is deleted.
                            </div>
                        </div>
                    ))}
                </div>
            </article>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {themedReferenceGroups.map(group => (
                    <article key={group.title} className="glass-panel p-5">
                        <h2 className="text-lg font-semibold">{group.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{group.description}</p>
                        <ul className="mt-4 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {group.paths.map(path => (
                                <li key={path}>{path}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}
