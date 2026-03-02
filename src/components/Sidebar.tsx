import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, Receipt, PieChart, Settings } from 'lucide-react';

interface SidebarProps {
    currentTab: string;
    onChangeTab: (tab: string) => void;
}

const navItems = [
    { id: 'dashboard', label: '概览', icon: LayoutDashboard },
    { id: 'transactions', label: '收支明细', icon: Receipt },
    { id: 'accounts', label: '资产与负债', icon: Wallet },
    { id: 'analytics', label: 'AI 财务诊断', icon: PieChart },
    { id: 'settings', label: '设置', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onChangeTab }) => {
    const [appName, setAppName] = useState('FinancePro');
    const [appShort, setAppShort] = useState('FP');

    useEffect(() => {
        const loadBranding = () => {
            setAppName(localStorage.getItem('finance_app_name') || 'FinancePro');
            setAppShort(localStorage.getItem('finance_app_short') || 'FP');
        };
        loadBranding();
        window.addEventListener('storage', loadBranding);
        window.addEventListener('branding-updated', loadBranding);
        return () => { window.removeEventListener('storage', loadBranding); window.removeEventListener('branding-updated', loadBranding); };
    }, []);

    return (
        <div className="glass-panel w-[260px] h-[calc(100vh-38px-32px)] m-4 ml-4 mb-4 mt-4 flex flex-col py-5 px-4 z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8] rounded-[10px] flex items-center justify-center text-white font-bold text-base shadow-md hover:shadow-[var(--shadow-md),0_0_24px_rgba(79,70,229,0.35)] transition-shadow duration-300">
                    {appShort}
                </div>
                <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">{appName}</span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1.5 flex-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeTab(item.id)}
                            className={`relative flex items-center gap-3.5 w-full py-3 px-3.5 rounded-[var(--radius-md)] border-none text-sm text-left transition-[transform,background-color,color,box-shadow] duration-150 cursor-pointer
                                ${isActive
                                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                                    : 'bg-transparent text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:translate-x-0.5'
                                }`}
                        >
                            {isActive && (
                                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-sm bg-gradient-to-b from-[var(--color-primary)] to-[#818cf8]" />
                            )}
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
