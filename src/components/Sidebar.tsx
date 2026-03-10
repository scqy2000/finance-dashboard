import { Blocks, FileStack, LayoutDashboard, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DEFAULT_BRANDING,
    THEME_EVENTS,
    type NavigationTab,
    getBranding,
} from '../utils/preferences';

type SidebarProps = {
    currentTab: NavigationTab;
    onChangeTab: (tab: NavigationTab) => void;
};

const navigationItems: Array<{
    id: NavigationTab;
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
}> = [
    { id: 'overview', label: 'Overview', description: 'Shell, state and runtime snapshot', icon: LayoutDashboard },
    { id: 'items', label: 'Items', description: 'Example CRUD, detail and child records', icon: Blocks },
    { id: 'references', label: 'References', description: 'Reusable and optional modules', icon: FileStack },
    { id: 'settings', label: 'Settings', description: 'Theme, branding and persisted prefs', icon: Settings },
];

export function Sidebar({ currentTab, onChangeTab }: SidebarProps) {
    const [branding, setBranding] = useState(DEFAULT_BRANDING);

    useEffect(() => {
        const syncBranding = () => setBranding(getBranding());

        syncBranding();
        window.addEventListener('storage', syncBranding);
        window.addEventListener(THEME_EVENTS.brandingChanged, syncBranding);

        return () => {
            window.removeEventListener('storage', syncBranding);
            window.removeEventListener(THEME_EVENTS.brandingChanged, syncBranding);
        };
    }, []);

    return (
        <aside className="w-[280px] border-r border-[var(--border-light)] bg-white/55 backdrop-blur-xl px-5 py-6 flex flex-col gap-6">
            <div className="glass-panel px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-[18px] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-lg font-semibold">
                        {branding.appShortName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                            Local-First Shell
                        </div>
                        <div className="text-[18px] font-semibold text-[var(--text-primary)]">
                            {branding.appName}
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    Keep the window shell, state pattern and SQLite boundary. Replace the example entity with your domain.
                </p>
            </div>

            <nav className="flex flex-col gap-2">
                {navigationItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChangeTab(item.id)}
                            data-testid={`nav-${item.id}`}
                            className={`motion-hover-lift flex items-start gap-3 rounded-[18px] px-4 py-3 text-left border ${
                                isActive
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--text-primary)]'
                                    : 'border-transparent bg-white/40 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-white/70'
                            }`}
                        >
                            <div className={`mt-0.5 rounded-[14px] p-2 ${isActive ? 'bg-white/75 text-[var(--color-primary)]' : 'bg-white/65'}`}>
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold">{item.label}</div>
                                <div className="text-xs leading-5 text-[var(--text-secondary)]">{item.description}</div>
                            </div>
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto glass-panel p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Core contract</div>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                    <li>`init()` once per session</li>
                    <li>`refreshAll()` after writes</li>
                    <li>Backend writes wrapped in transactions</li>
                </ul>
            </div>
        </aside>
    );
}

