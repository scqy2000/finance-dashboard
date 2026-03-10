import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Accounts } from './pages/Accounts';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { useStore } from './store/useStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return `rgba(79, 70, 229, ${alpha})`;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyTheme = () => {
    const root = document.documentElement;
    // Theme Color
    const themeColor = localStorage.getItem('finance_theme_color') || '#4f46e5'; // default Indigo
    root.style.setProperty('--color-primary', themeColor);
    root.style.setProperty('--color-primary-light', hexToRgba(themeColor, 0.12));
    root.style.setProperty('--color-primary-glow', hexToRgba(themeColor, 0.35));

    // 背景材质通过 CSS 变量切换，避免频繁 class 切换引发闪烁。
    const bgStyle = localStorage.getItem('finance_bg_style') || 'solid';
    if (bgStyle === 'mesh') {
        root.style.setProperty('--bg-app', 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)');
    } else if (bgStyle === 'gradient-blue') {
        root.style.setProperty('--bg-app', 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)');
    } else if (bgStyle === 'gradient-purple') {
        root.style.setProperty('--bg-app', 'linear-gradient(to right, #fa709a 0%, #fee140 100%)');
    } else {
        root.style.setProperty('--bg-app', '#f4f6fa'); // solid light gray
    }

};

const App: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<string>('dashboard');
    const init = useStore(s => s.init);

    useEffect(() => {
        applyTheme();
        // 应用启动时只做一次全局数据预加载。
        init();
        window.addEventListener('storage', applyTheme);
        return () => window.removeEventListener('storage', applyTheme);
    }, [init]);

    return (
        <div className="app-container">
            <div className="title-bar" data-tauri-drag-region>
                <div className="title-bar-title label" data-tauri-drag-region>
                    Finance Dashboard
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
                    {currentTab === 'dashboard' && <Dashboard />}
                    {currentTab === 'transactions' && <Transactions />}
                    {currentTab === 'accounts' && <Accounts />}
                    {currentTab === 'analytics' && <Analytics />}
                    {currentTab === 'settings' && <Settings />}
                </main>
            </div>
        </div>
    );
};

export default App;
