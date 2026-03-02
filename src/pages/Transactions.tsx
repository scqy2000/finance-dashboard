import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Download, Upload, Settings2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { TransactionsApi } from '../api/db';
import type { Transaction, TransactionFilters, TransactionPage } from '../api/db';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { CategoryManager } from '../components/CategoryManager';
import { CsvImportModal } from '../components/CsvImportModal';
import { ActionMenu } from '../components/transactions/ActionMenu';
import {
    dateOnlyForFileName,
    inputDateTimeToStorage,
    localDateOnlyToExclusiveEndIso,
    localDateOnlyToStartIso,
    nowLocalDateTimeInputValue,
} from '../utils/datetime';
import { formatMoneyCny, formatTimeZh } from '../utils/formatters';
import { getErrorMessage } from '../utils/errors';
import { useFeedback } from '../components/ui/FeedbackProvider';

const PAGE_SIZE = 50;

type ImportRow = {
    account_id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
};

type ImportFailure = {
    index: number;
    reason: string;
    row: ImportRow;
};

const EMPTY_PAGE: TransactionPage = {
    items: [],
    total: 0,
    page: 1,
    page_size: PAGE_SIZE,
    total_pages: 0,
    has_more: false,
};

export const Transactions: React.FC = () => {
    const { toast, confirm } = useFeedback();
    const { accounts, refreshAccounts } = useAccounts();
    const { categories, refreshCategories, addCategory, updateCategory, deleteCategory } = useCategories();

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageData, setPageData] = useState<TransactionPage>(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [filterAccountId, setFilterAccountId] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterMinAmount, setFilterMinAmount] = useState('');
    const [filterMaxAmount, setFilterMaxAmount] = useState('');

    const [txType, setTxType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(nowLocalDateTimeInputValue());
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showCsvImport, setShowCsvImport] = useState(false);

    const activeFilters = useMemo<TransactionFilters>(() => {
        const minAmount = filterMinAmount.trim() ? Number(filterMinAmount) : null;
        const maxAmount = filterMaxAmount.trim() ? Number(filterMaxAmount) : null;
        return {
            query: searchQuery || undefined,
            account_id: filterAccountId || undefined,
            category: filterCategory || undefined,
            tx_type: filterType === 'all' ? undefined : filterType,
            date_from: filterDateFrom ? localDateOnlyToStartIso(filterDateFrom) || undefined : undefined,
            date_to: filterDateTo ? localDateOnlyToExclusiveEndIso(filterDateTo) || undefined : undefined,
            min_amount: minAmount != null && Number.isFinite(minAmount) && minAmount >= 0 ? minAmount : undefined,
            max_amount: maxAmount != null && Number.isFinite(maxAmount) && maxAmount >= 0 ? maxAmount : undefined,
        };
    }, [searchQuery, filterAccountId, filterCategory, filterType, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount]);

    const hasActiveFilters = useMemo(() => {
        return Boolean(
            searchQuery ||
            filterAccountId ||
            filterCategory ||
            filterType !== 'all' ||
            filterDateFrom ||
            filterDateTo ||
            filterMinAmount.trim() ||
            filterMaxAmount.trim()
        );
    }, [searchQuery, filterAccountId, filterCategory, filterType, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount]);

    const resetFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setFilterAccountId('');
        setFilterCategory('');
        setFilterType('all');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterMinAmount('');
        setFilterMaxAmount('');
        setPage(1);
    };

    const loadPage = useCallback(async (targetPage: number) => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await TransactionsApi.getPage(targetPage, PAGE_SIZE, activeFilters);
            setPageData(data);
            if (data.page !== targetPage) {
                setPage(data.page);
            }
        } catch (e: unknown) {
            setLoadError(getErrorMessage(e, '流水加载失败'));
        } finally {
            setLoading(false);
        }
    }, [activeFilters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const normalized = searchInput.trim();
            setSearchQuery(normalized);
            setPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        loadPage(page);
    }, [page, loadPage]);

    const handleCsvImport = async (rows: ImportRow[]) => {
        let success = 0;
        let failed = 0;
        const failedRows: ImportFailure[] = [];

        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            try {
                await TransactionsApi.create(row);
                success++;
            } catch (e: unknown) {
                failed++;
                failedRows.push({
                    index: i + 1,
                    reason: getErrorMessage(e),
                    row,
                });
            }
        }

        await Promise.all([refreshAccounts(), refreshCategories()]);
        setPage(1);
        await loadPage(1);
        return { success, failed, failedRows };
    };

    const handleExportCsv = async () => {
        try {
            let exportRows: Transaction[] = [];
            let current = 1;
            while (true) {
                const chunk = await TransactionsApi.getPage(current, 200, activeFilters);
                exportRows = exportRows.concat(chunk.items);
                if (!chunk.has_more) break;
                current += 1;
            }

            if (exportRows.length === 0) {
                toast('暂无数据可导出', 'info');
                return;
            }

            const filePath = await save({
                defaultPath: `流水记录_${dateOnlyForFileName()}.csv`,
                filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
            });
            if (!filePath) return;

            const header = '日期,类型,分类,金额,描述,账户';
            const rows = exportRows.map(tx => {
                const datePart = tx.date.split('T')[0];
                const type = tx.amount < 0 ? '支出' : '收入';
                const amt = tx.amount.toFixed(2);
                const desc = (tx.description || '').replace(/,/g, '，');
                const accName = (accounts.find(a => a.id === tx.account_id)?.name || '').replace(/,/g, '，');
                return `${datePart},${type},${tx.category},${amt},${desc},${accName}`;
            });

            const csv = '\uFEFF' + [header, ...rows].join('\n');
            await writeTextFile(filePath, csv);
            toast(`已成功导出 ${exportRows.length} 条记录`, 'success');
        } catch (e: unknown) {
            toast('导出失败: ' + getErrorMessage(e), 'error');
        }
    };

    const groupedTransactions = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        pageData.items.forEach(tx => {
            const day = tx.date.split('T')[0];
            if (!groups[day]) groups[day] = [];
            groups[day].push(tx);
        });
        return groups;
    }, [pageData.items]);

    const currentCategories = categories.filter(c => c.type === txType);

    const handleSave = async () => {
        if (!amount || !accountId) {
            toast('请输入金额并选择关联账户', 'error');
            return;
        }

        try {
            let numericAmount = parseFloat(amount);
            if (Number.isNaN(numericAmount) || numericAmount <= 0) {
                toast('请输入有效金额', 'error');
                return;
            }
            if (txType === 'expense') numericAmount = -Math.abs(numericAmount);
            else numericAmount = Math.abs(numericAmount);

            const finalCategory = category || currentCategories[0]?.name || (txType === 'expense' ? '其他支出' : '其他收入');

            await TransactionsApi.create({
                account_id: accountId,
                amount: numericAmount,
                category: finalCategory,
                description,
                date: inputDateTimeToStorage(date),
            });

            setAmount('');
            setDescription('');
            setCategory('');
            setDate(nowLocalDateTimeInputValue());
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            toast('保存成功', 'success');

            await refreshAccounts();
            setPage(1);
            await loadPage(1);
        } catch (e: unknown) {
            toast('保存失败: ' + getErrorMessage(e), 'error');
        }
    };

    const handleDelete = async (tx: Transaction) => {
        const ok = await confirm('确认删除', `确定删除"${tx.description || tx.category}"？`);
        if (!ok) return;
        try {
            await TransactionsApi.delete(tx);
            await refreshAccounts();
            await loadPage(page);
            toast('删除成功', 'success');
        } catch (e: unknown) {
            toast('删除失败: ' + getErrorMessage(e), 'error');
        }
    };

    const handleEditSave = async (id: string, oldTx: Transaction, newData: Partial<Transaction>) => {
        try {
            await TransactionsApi.update(id, oldTx, newData);
            await refreshAccounts();
            await loadPage(page);
            return true;
        } catch (e: unknown) {
            toast('保存失败: ' + getErrorMessage(e), 'error');
            return false;
        }
    };

    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || '未知';
    const getAccountClass = (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (!acc) return 'bg-emerald-500/15 text-emerald-600';
        if (acc.name.includes('宝') || acc.name.includes('花')) return 'bg-amber-500/15 text-amber-600';
        if (acc.name.includes('信用')) return 'bg-amber-500/15 text-amber-600';
        return 'bg-emerald-500/15 text-emerald-600';
    };

    const getCategoryEmoji = (catName: string, amt: number) => {
        const cat = categories.find(c => c.name === catName);
        if (cat) return cat.emoji;
        return amt > 0 ? '💼' : '💰';
    };

    const getAssetAccounts = () => accounts.filter(a => a.type === 'asset');
    const getLiabilityAccounts = () => accounts.filter(a => a.type === 'liability');

    return (
        <div className="flex flex-col gap-6 h-full">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-gradient text-[28px] font-bold tracking-tight mb-1">收支明细</h1>
                    <p className="text-[var(--text-tertiary)] text-sm">按分页加载流水，当前共 {pageData.total} 笔记录。</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-secondary glass-panel motion-hover-lift flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] text-[13px] font-medium text-[var(--text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-px hover:shadow-sm cursor-pointer" onClick={() => setShowCategoryManager(true)}>
                        <Settings2 size={16} /> 分类管理
                    </button>
                    <button className="btn-secondary glass-panel motion-hover-lift flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] text-[13px] font-medium text-[var(--text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-px hover:shadow-sm cursor-pointer" onClick={() => setShowCsvImport(true)}>
                        <Download size={16} /> 导入 CSV
                    </button>
                    <button className="btn-secondary glass-panel motion-hover-lift flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] text-[13px] font-medium text-[var(--text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-px hover:shadow-sm cursor-pointer" onClick={handleExportCsv}>
                        <Upload size={16} /> 导出 CSV
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[2.5fr_1fr] gap-6 flex-1 min-h-0">
                <div className="glass-panel flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-light)] flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="搜索流水（按描述、分类、日期或金额）..."
                            className="w-full py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white/50 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-250 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-md)]"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />

                        <div className="grid grid-cols-4 gap-2">
                            <select className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)}>
                                <option value="">全部账户</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>

                            <select className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                <option value="">全部分类</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                            </select>

                            <select className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterType} onChange={e => setFilterType(e.target.value as 'all' | 'expense' | 'income')}>
                                <option value="all">全部类型</option>
                                <option value="expense">仅支出</option>
                                <option value="income">仅收入</option>
                            </select>

                            <button className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-surface-hover)] disabled:opacity-50" disabled={!hasActiveFilters} onClick={resetFilters}>
                                <RotateCcw size={12} /> 重置筛选
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <input type="date" className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="开始日期" />
                            <input type="date" className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="结束日期" />
                            <input type="number" step="0.01" min="0" placeholder="最小金额" className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} />
                            <input type="number" step="0.01" min="0" placeholder="最大金额" className="py-2 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs bg-white/70 outline-none" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex py-3 px-6 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-light)]">
                        <div className="flex-[2]">详情</div>
                        <div className="flex-1">账户</div>
                        <div className="w-[120px] text-right">金额</div>
                        <div className="w-10 text-right"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        {loading ? (
                            <div className="py-5 text-center text-[var(--text-secondary)]">加载中...</div>
                        ) : loadError ? (
                            <div className="py-5 text-center text-[var(--color-danger)] text-sm">{loadError}</div>
                        ) : Object.keys(groupedTransactions).length === 0 ? (
                            <div className="py-10 text-center text-[var(--text-secondary)]">
                                {hasActiveFilters ? '当前筛选条件下暂无记录' : '暂无收支记录'}
                            </div>
                        ) : (
                            Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)).map(day => (
                                <div className="mt-6" key={day}>
                                    <h3 className="text-[13px] font-semibold text-[var(--text-tertiary)] mb-3 pl-2">{day}</h3>
                                    {groupedTransactions[day].map(tx => (
                                        <div className="group flex items-center py-3 px-2 rounded-[var(--radius-md)] transition-[transform,background-color,border-color] duration-150 border-l-[3px] border-l-transparent hover:bg-[var(--bg-surface-hover)] hover:border-l-[var(--color-primary)] hover:translate-x-0.5" key={tx.id}>
                                            <div className="flex-[2] flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--bg-app)]">
                                                    {getCategoryEmoji(tx.category, tx.amount)}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{tx.description || tx.category}</span>
                                                    <span className="text-xs text-[var(--text-tertiary)]">{tx.category} · {formatTimeZh(tx.date)}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <span className={`text-xs py-1 px-2 rounded-full font-medium ${getAccountClass(tx.account_id)}`}>{getAccountName(tx.account_id)}</span>
                                            </div>
                                            <div className={`w-[120px] text-right font-semibold text-[15px] ${tx.amount < 0 ? 'text-[var(--text-primary)]' : 'text-[var(--color-success)]'}`}>
                                                {formatMoneyCny(tx.amount)}
                                            </div>
                                            <div className="w-10 text-right">
                                                <ActionMenu onEdit={() => setEditingTx(tx)} onDelete={() => handleDelete(tx)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-[var(--border-light)] p-3 px-4 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-tertiary)]">
                            第 {pageData.total_pages === 0 ? 0 : pageData.page} / {pageData.total_pages} 页 · 每页 {pageData.page_size} 条
                        </span>
                        <div className="flex gap-2">
                            <button
                                className="btn-secondary flex items-center gap-1 py-1.5 px-3 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[12px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || pageData.page <= 1}
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            >
                                <ChevronLeft size={14} /> 上一页
                            </button>
                            <button
                                className="btn-secondary flex items-center gap-1 py-1.5 px-3 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[12px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || !pageData.has_more}
                                onClick={() => setPage(prev => prev + 1)}
                            >
                                下一页 <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <h2 className="text-base font-semibold mb-6">快速记账</h2>
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                        <div className="flex bg-black/[0.04] p-1 rounded-[var(--radius-md)] mb-6">
                            <button type="button" onClick={() => { setTxType('expense'); setCategory(''); }}
                                className={`flex-1 py-2 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${txType === 'expense' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                支出
                            </button>
                            <button type="button" onClick={() => { setTxType('income'); setCategory(''); }}
                                className={`flex-1 py-2 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${txType === 'income' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                收入
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">金额 (¥)</label>
                            <input type="number" step="0.01" placeholder="0.00"
                                className="w-full py-3 px-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-2xl font-semibold outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]"
                                value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">分类</label>
                            <select className="w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]"
                                value={category} onChange={e => setCategory(e.target.value)}>
                                <option value="">选择分类...</option>
                                {currentCategories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">描述 (选填)</label>
                            <input type="text" placeholder="款项说明..."
                                className="w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]"
                                value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">关联账户</label>
                            <select className="w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]"
                                value={accountId} onChange={e => setAccountId(e.target.value)}>
                                <option value="" disabled>选择关联账户</option>
                                {getAssetAccounts().length > 0 && <optgroup label="资产">{getAssetAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
                                {getLiabilityAccounts().length > 0 && <optgroup label="负债">{getLiabilityAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">日期与时间</label>
                            <input type="datetime-local"
                                className="w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]"
                                value={date} onChange={e => setDate(e.target.value)} />
                        </div>

                        <button type="submit"
                            className={`btn-primary w-full justify-center p-3 mt-4 flex items-center gap-1.5 border-none text-[13px] font-medium rounded-[var(--radius-md)] cursor-pointer ${saveSuccess ? 'bg-[var(--color-success)] shadow-[0_4px_10px_rgba(16,185,129,0.3)]' : 'bg-[var(--color-primary)] shadow-[0_4px_10px_rgba(79,70,229,0.3)]'} text-white hover:shadow-[0_6px_14px_rgba(79,70,229,0.4)] hover:-translate-y-px`}>
                            {saveSuccess ? '✓ 已保存' : '保存记录'}
                        </button>
                    </form>
                </div>
            </div>

            <TransactionEditModal
                isOpen={!!editingTx}
                transaction={editingTx}
                categories={categories}
                accounts={accounts}
                onClose={() => setEditingTx(null)}
                onSave={handleEditSave}
                onDelete={tx => {
                    handleDelete(tx);
                    setEditingTx(null);
                }}
            />
            <CategoryManager
                isOpen={showCategoryManager}
                categories={categories}
                onClose={() => setShowCategoryManager(false)}
                onAdd={addCategory}
                onUpdate={updateCategory}
                onDelete={deleteCategory}
            />
            <CsvImportModal
                isOpen={showCsvImport}
                accounts={accounts}
                onClose={() => setShowCsvImport(false)}
                onImport={handleCsvImport}
            />
        </div>
    );
};
