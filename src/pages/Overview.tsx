import { useEffect, useState } from 'react';
import { Database, MonitorSmartphone, Rocket, Shapes } from 'lucide-react';
import { SystemApi } from '../api/client';
import type { AppInfo } from '../api/types';
import { useStore } from '../store/useStore';

const pillars = [
    {
        title: 'Desktop shell',
        description: 'Custom title bar, sidebar layout and themed surface styles are kept in the runtime core.',
        icon: MonitorSmartphone,
    },
    {
        title: 'Local data boundary',
        description: 'SQLite init, migrations and Tauri commands stay local-first and synchronous from the app perspective.',
        icon: Database,
    },
    {
        title: 'Example flow',
        description: 'One CRUD entity with pagination remains as a reference loop for new domain modules.',
        icon: Rocket,
    },
    {
        title: 'Reference modules',
        description: 'Finance, CSV import, AI chat and cross-table logic are moved out of core and documented as optional references.',
        icon: Shapes,
    },
];

export function Overview() {
    const overview = useStore(state => state.overview);
    const overviewLoading = useStore(state => state.overviewLoading);
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

    useEffect(() => {
        let active = true;

        SystemApi.getInfo()
            .then(info => {
                if (active) {
                    setAppInfo(info);
                }
            })
            .catch(error => {
                console.error('Failed to load app info', error);
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
                <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Template core</div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        Local-first desktop template
                    </h1>
                    <p className="max-w-[760px] text-[15px] leading-7 text-[var(--text-secondary)]">
                        The finance-specific product is no longer the runtime. What remains here is the reusable shell:
                        React, Zustand, Tauri, Rust and SQLite wired together with one small example domain.
                    </p>
                </div>
            </header>

            <div className="stats-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-panel p-5">
                    <div className="text-sm text-[var(--text-secondary)]">Total example items</div>
                    <div className="mt-3 text-3xl font-semibold">{overviewLoading ? '...' : overview?.total_items ?? 0}</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-sm text-[var(--text-secondary)]">Active</div>
                    <div className="mt-3 text-3xl font-semibold">{overviewLoading ? '...' : overview?.active_items ?? 0}</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-sm text-[var(--text-secondary)]">Draft</div>
                    <div className="mt-3 text-3xl font-semibold">{overviewLoading ? '...' : overview?.draft_items ?? 0}</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-sm text-[var(--text-secondary)]">Archived</div>
                    <div className="mt-3 text-3xl font-semibold">{overviewLoading ? '...' : overview?.archived_items ?? 0}</div>
                </div>
            </div>

            <div className="cards-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
                {pillars.map(item => {
                    const Icon = item.icon;
                    return (
                        <article key={item.title} className="glass-panel p-5">
                            <div className="flex items-start gap-4">
                                <div className="rounded-[18px] bg-[var(--color-primary-light)] p-3 text-[var(--color-primary)]">
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">{item.title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <article className="glass-panel p-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">What to keep</div>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                        <li>Use the unified frontend API layer as the only place that knows Tauri command names.</li>
                        <li>Keep `init()` and `refreshAll()` as the default state contract until the domain needs finer invalidation.</li>
                        <li>Wrap writes in transactions and fetch current database state before derived updates.</li>
                        <li>Split optional capabilities into removable modules instead of expanding template core.</li>
                    </ul>
                </article>

                <article className="glass-panel p-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Runtime</div>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div>
                            <dt className="text-[var(--text-tertiary)]">Version</dt>
                            <dd className="text-[var(--text-primary)]">{appInfo?.version ?? 'Loading...'}</dd>
                        </div>
                        <div>
                            <dt className="text-[var(--text-tertiary)]">Mode</dt>
                            <dd className="text-[var(--text-primary)]">{appInfo ? (appInfo.isPackaged ? 'Packaged build' : 'Development') : 'Loading...'}</dd>
                        </div>
                        <div>
                            <dt className="text-[var(--text-tertiary)]">Data path</dt>
                            <dd className="break-all text-[var(--text-primary)]">{appInfo?.userData ?? 'Loading...'}</dd>
                        </div>
                    </dl>
                </article>
            </div>
        </section>
    );
}
