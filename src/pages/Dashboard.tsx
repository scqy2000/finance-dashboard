import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { FinanceApi } from '../api/db';
import type { FinanceSnapshot } from '../api/db';
import { dateToLocalIso, nowLocalIso } from '../utils/datetime';
import { getErrorMessage } from '../utils/errors';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';
const TIME_RANGE_LABELS: Record<TimeRange, string> = { week: '本周', month: '本月', quarter: '本季', year: '全年' };

function getTimeRangeStart(range: TimeRange): string {
    const now = new Date();
    switch (range) {
        case 'week': {
            // 以周一作为一周起点；周日场景回拨到上周一。
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
            d.setHours(0, 0, 0, 0);
            return dateToLocalIso(d);
        }
        case 'month':
            return dateToLocalIso(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
        case 'quarter': {
            const q = Math.floor(now.getMonth() / 3) * 3;
            return dateToLocalIso(new Date(now.getFullYear(), q, 1, 0, 0, 0));
        }
        case 'year':
            return dateToLocalIso(new Date(now.getFullYear(), 0, 1, 0, 0, 0));
    }
}

const EMPTY_SUMMARY: FinanceSnapshot = {
    total_assets: 0,
    total_debt: 0,
    net_worth: 0,
    period_income: 0,
    period_expense: 0,
    monthly_installment: 0,
    transaction_count: 0,
    account_count: 0,
    active_installments: 0,
    recent_transactions: [],
};

export const Dashboard: React.FC = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [showRangeMenu, setShowRangeMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<FinanceSnapshot>(EMPTY_SUMMARY);

    useEffect(() => {
        let cancelled = false;
        const loadSummary = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await FinanceApi.getSnapshot(getTimeRangeStart(timeRange), nowLocalIso(), 5);
                if (!cancelled) setSummary(data);
            } catch (e: unknown) {
                if (!cancelled) setError(getErrorMessage(e, '加载财务概览失败'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadSummary();
        return () => { cancelled = true; };
    }, [timeRange]);

    const periodLabel = TIME_RANGE_LABELS[timeRange];

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
    };

    const formatDate = (isoDate: string) => {
        try {
            const d = new Date(isoDate);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
            if (diffDays === 1) return '昨天';
            if (diffDays < 7) return `${diffDays} 天前`;
            return `${d.getMonth() + 1}月${d.getDate()}日`;
        } catch { return ''; }
    };

    const getCategoryEmoji = (cat: string, amt: number) => {
        const emojiMap: Record<string, string> = {
            '餐饮美食': '🍔', '交通出行': '🚗', '日常购物': '🛒',
            '生活缴费': '💡', '休闲娱乐': '🎮', '医疗健康': '🏥',
            '教育学习': '📚', '工资收入': '💼', '理财收益': '📈',
            '红包转账': '🧧', '退款': '↩️',
        };
        return emojiMap[cat] || (amt > 0 ? '💼' : '💰');
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6 items-center justify-center h-full">
                <p className="text-[var(--text-secondary)]">加载财务概览中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-6 items-center justify-center h-full">
                <p className="text-[var(--color-danger)] text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-gradient text-[28px] font-bold tracking-tight mb-1">财务概览</h1>
                    <p className="text-[var(--text-tertiary)] text-sm">欢迎回来。这是您{periodLabel}的财务概况。</p>
                </div>
                <div className="relative">
                    <button
                        className="glass-panel px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-surface-hover)] transition-[background-color,color,box-shadow,transform] duration-150 border-none"
                        onClick={() => setShowRangeMenu(!showRangeMenu)}
                    >
                        {periodLabel} ▾
                    </button>
                    {showRangeMenu && (
                        <div className="motion-dropdown-fade absolute right-0 top-full mt-1 bg-[var(--bg-surface-solid)] border border-[var(--border-light)] rounded-[var(--radius-md)] shadow-lg z-50 min-w-[100px] p-1 backdrop-blur-[20px]">
                            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map(r => (
                                <button key={r}
                                    className={`w-full py-2 px-3 border-none text-[13px] text-left cursor-pointer rounded-[var(--radius-sm)] transition-colors duration-150 ${timeRange === r ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold' : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'}`}
                                    onClick={() => { setTimeRange(r); setShowRangeMenu(false); }}
                                >
                                    {TIME_RANGE_LABELS[r]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <div className="stats-grid grid grid-cols-4 gap-5">
                <div className="glass-panel motion-hover-lift p-5 flex gap-4 items-center relative overflow-hidden hover:-translate-y-[3px] hover:shadow-lg group before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-transparent before:via-[var(--border-light)] before:to-transparent before:transition-[opacity,transform] before:duration-300 hover:before:via-[#818cf8] hover:before:from-[var(--color-primary)]">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-[var(--color-success-bg)] text-[var(--color-success)]">
                        <ArrowUpRight size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-[var(--text-secondary)] font-medium">{periodLabel}收入 <small className="font-normal text-[var(--text-tertiary)]">(聚合统计)</small></span>
                        <span className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{formatMoney(summary.period_income)}</span>
                    </div>
                </div>
                <div className="glass-panel motion-hover-lift p-5 flex gap-4 items-center relative overflow-hidden hover:-translate-y-[3px] hover:shadow-lg group before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-transparent before:via-[var(--border-light)] before:to-transparent before:transition-[opacity,transform] before:duration-300 hover:before:via-[#818cf8] hover:before:from-[var(--color-primary)]">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                        <ArrowDownRight size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-[var(--text-secondary)] font-medium">{periodLabel}支出 <small className="font-normal text-[var(--text-tertiary)]">(聚合统计)</small></span>
                        <span className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{formatMoney(summary.period_expense)}</span>
                    </div>
                </div>
                <div className="glass-panel motion-hover-lift p-5 flex gap-4 items-center relative overflow-hidden hover:-translate-y-[3px] hover:shadow-lg group before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-transparent before:via-[var(--border-light)] before:to-transparent before:transition-[opacity,transform] before:duration-300 hover:before:via-[#818cf8] hover:before:from-[var(--color-primary)]">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-amber-500/10 text-[var(--color-warning)]">
                        <CreditCard size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-[var(--text-secondary)] font-medium">待还负债 <small className="font-normal text-[var(--text-tertiary)]">(负债账户)</small></span>
                        <span className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{formatMoney(summary.total_debt)}</span>
                    </div>
                </div>
                <div className="glass-panel motion-hover-lift p-5 flex gap-4 items-center relative overflow-hidden hover:-translate-y-[3px] hover:shadow-lg border border-[var(--color-primary-light)] bg-gradient-to-b from-[var(--bg-surface)] to-white/95 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-transparent before:via-[var(--border-light)] before:to-transparent before:transition-[opacity,transform] before:duration-300 hover:before:from-[var(--color-primary)] hover:before:to-[#818cf8]">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8] text-white">
                        <Wallet size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-[var(--text-secondary)] font-medium">资产净值</span>
                        <span className="text-gradient text-[22px] font-bold tracking-tight tabular-nums">{formatMoney(summary.net_worth)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-6">
                <div className="glass-panel p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-base font-semibold">最近收支</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                        {summary.recent_transactions.length === 0 ? (
                            <div className="py-5 text-center text-[var(--text-tertiary)] text-[13px]">暂无流水记录</div>
                        ) : (
                            summary.recent_transactions.map(tx => (
                                <div className="flex items-center p-3 rounded-[var(--radius-md)] bg-white/40 border border-[var(--border-light)] transition-[transform,background-color,box-shadow,border-color] duration-150 hover:bg-[var(--bg-surface-solid)] hover:translate-x-0.5 hover:shadow-sm" key={tx.id}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--bg-app)] mr-4">
                                        {getCategoryEmoji(tx.category, tx.amount)}
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{tx.description || tx.category}</span>
                                        <span className="text-xs text-[var(--text-tertiary)]">{formatDate(tx.date)}</span>
                                    </div>
                                    <span className={`font-semibold text-[15px] ${tx.amount < 0 ? 'text-[var(--text-primary)]' : 'text-[var(--color-success)]'}`}>
                                        {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-base font-semibold">财务摘要</h2>
                        <TrendingUp size={20} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        <p className="text-[13px] text-[var(--text-tertiary)] mb-2">
                            💡 <em>收支数据来自后端聚合接口，避免大账本下前端全量计算卡顿。</em>
                        </p>
                        <p>您的总资产为 <strong>{formatMoney(summary.total_assets)}</strong>，待还负债 <strong>{formatMoney(summary.total_debt)}</strong>，净值 <strong>{formatMoney(summary.net_worth)}</strong>。</p>
                        <ul className="mt-4 pl-5 flex flex-col gap-2">
                            <li>{periodLabel}收入（聚合）：<strong className="text-[var(--text-primary)]">{formatMoney(summary.period_income)}</strong></li>
                            <li>{periodLabel}支出（聚合）：<strong className="text-[var(--text-primary)]">{formatMoney(summary.period_expense)}</strong></li>
                            <li>{periodLabel}结余：<strong className="text-[var(--text-primary)]">{formatMoney(summary.period_income - summary.period_expense)}</strong></li>
                            <li>负债率：<strong className="text-[var(--text-primary)]">{summary.total_assets > 0 ? ((summary.total_debt / summary.total_assets) * 100).toFixed(1) : 0}%</strong></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
