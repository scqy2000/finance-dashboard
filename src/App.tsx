import { getCurrentWindow } from '@tauri-apps/api/window';
import { Blocks, FileStack, LayoutDashboard, Minus, Settings as SettingsIcon, Square, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Items } from './pages/Items';
import { Overview } from './pages/Overview';
import { References } from './pages/References';
import { Settings } from './pages/Settings';
import { initializeTemplateRuntime } from './store/runtime';
import {
    DEFAULT_BRANDING,
    THEME_EVENTS,
    applyTheme,
    getBranding,
    type NavigationTab,
} from './utils/preferences';

const titleMap: Record<NavigationTab, { title: string; description: string; icon: React.ComponentType<{ size?: number }> }> = {
    overview: {
        title: 'Overview',
        description: 'Shell, runtime and reusable contracts.',
        icon: LayoutDashboard,
    },
    items: {
        title: 'Items',
        description: 'Minimal CRUD loop with pagination.',
        icon: Blocks,
    },
    references: {
        title: 'References',
        description: 'Reusable modules and extraction map.',
        icon: FileStack,
    },
    settings: {
        title: 'Settings',
        description: 'Theme, branding and persisted preferences.',
        icon: SettingsIcon,
    },
};

const App: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
    const [appName, setAppName] = useState(DEFAULT_BRANDING.appName);

    useEffect(() => {
        const syncAppearance = () => {
            applyTheme();
            setAppName(getBranding().appName);
        };

        syncAppearance();
        void initializeTemplateRuntime();

        window.addEventListener('storage', syncAppearance);
        window.addEventListener(THEME_EVENTS.appearanceChanged, syncAppearance);
        window.addEventListener(THEME_EVENTS.brandingChanged, syncAppearance);

        return () => {
            window.removeEventListener('storage', syncAppearance);
            window.removeEventListener(THEME_EVENTS.appearanceChanged, syncAppearance);
            window.removeEventListener(THEME_EVENTS.brandingChanged, syncAppearance);
        };
    }, []);

    const currentTitle = useMemo(() => titleMap[currentTab], [currentTab]);
    const TitleIcon = currentTitle.icon;

    return (
        <div className="app-container">
            <div className="title-bar" data-tauri-drag-region>
                <div className="title-bar-title label gap-3" data-tauri-drag-region>
                    <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)]">
                        Template
                    </span>
                    <span>{appName}</span>
                </div>
                <div className="titlebar-actions flex items-center h-full">
                    <button type="button" className="titlebar-btn" onClick={() => getCurrentWindow().minimize()}>
                        <Minus size={14} />
                    </button>
                    <button type="button" className="titlebar-btn" onClick={() => getCurrentWindow().toggleMaximize()}>
                        <Square size={12} />
                    </button>
                    <button type="button" className="titlebar-btn close-btn" onClick={() => getCurrentWindow().close()}>
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="app-wrapper">
                <Sidebar currentTab={currentTab} onChangeTab={setCurrentTab} />

                <main className="page-container">
                    <div className="mb-6 flex items-center gap-4 rounded-[22px] border border-white/60 bg-white/50 px-5 py-4 backdrop-blur-xl">
                        <div className="rounded-[18px] bg-[var(--color-primary-light)] p-3 text-[var(--color-primary)]">
                            <TitleIcon size={20} />
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-[var(--text-primary)]">{currentTitle.title}</div>
                            <div className="text-sm text-[var(--text-secondary)]">{currentTitle.description}</div>
                        </div>
                    </div>

                    {currentTab === 'overview' && <Overview />}
                    {currentTab === 'items' && <Items />}
                    {currentTab === 'references' && <References />}
                    {currentTab === 'settings' && <Settings />}
                </main>
            </div>
        </div>
    );
};

export default App;
