import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, CreditCard, Building2, Smartphone, Building, RefreshCw, CircleDollarSign, Pencil, X, Trash2, MoreVertical } from 'lucide-react';
import { useAccounts } from '../hooks/useAccounts';
import { useInstallments } from '../hooks/useInstallments';
import { seedDatabase } from '../api/seeder';
import { AccountModal } from '../components/AccountModal';
import { InstallmentModal } from '../components/InstallmentModal';
import { Account } from '../api/db';
import { useStore } from '../store/useStore';

// Inline Account Edit Modal
const AccountEditModal: React.FC<{
    account: Account | null;
    onClose: () => void;
    onSave: (id: string, data: Partial<Account>) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}> = ({ account, onClose, onSave, onDelete }) => {
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [color, setColor] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [statementDate, setStatementDate] = useState('');
    const [dueDate, setDueDate] = useState('');

    React.useEffect(() => {
        if (account) {
            setName(account.name);
            setBalance(String(Math.abs(account.balance ?? 0)));
            setColor(account.color ?? '#4F46E5');
            setCreditLimit(account.credit_limit != null ? String(account.credit_limit) : '');
            setStatementDate(account.statement_date != null ? String(account.statement_date) : '');
            setDueDate(account.due_date != null ? String(account.due_date) : '');
        }
    }, [account]);

    if (!account) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let bal = parseFloat(balance || '0');
        if (account.type === 'liability') bal = -Math.abs(bal);
        else bal = Math.abs(bal);
        const success = await onSave(account.id, {
            name, balance: bal, color,
            credit_limit: creditLimit ? parseFloat(creditLimit) : null,
            statement_date: statementDate ? parseInt(statementDate) : null,
            due_date: dueDate ? parseInt(dueDate) : null,
        });
        if (success) onClose();
    };

    const handleDelete = async () => {
        if (confirm(`确定删除账户"${account.name}"吗？该账户下的所有流水和分期记录也将被一并删除！`)) {
            await onDelete(account.id);
            onClose();
        }
    };

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#0284c7', '#475569', '#e11d48'];
    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[440px] max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold">编辑账户</h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">账户名称</label>
                            <input type="text" className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">{account.type === 'asset' ? '当前余额' : '当前欠款'} (¥)</label>
                            <input type="number" step="0.01" className={inputCls} value={balance} onChange={e => setBalance(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">卡片颜色</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {colors.map(c => (
                                    <div key={c} className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110" style={{ backgroundColor: c, border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent' }} onClick={() => setColor(c)} />
                                ))}
                            </div>
                        </div>
                        {account.type === 'liability' && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">额度 (¥)</label>
                                    <input type="number" className={inputCls} value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">账单日 (1-31)</label>
                                        <input type="number" min="1" max="31" className={inputCls} value={statementDate} onChange={e => setStatementDate(e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">还款日 (1-31)</label>
                                        <input type="number" min="1" max="31" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3 p-5 border-t border-[var(--border-light)]">
                        <button type="button" className="btn-secondary py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--color-danger)] cursor-pointer hover:bg-[var(--color-danger-bg)]" onClick={handleDelete}>删除账户</button>
                        <div className="flex-1" />
                        <button type="button" className="btn-secondary py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={onClose}>取消</button>
                        <button type="submit" className="btn-primary py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)]">保存修改</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Accounts: React.FC = () => {
    const { accounts, loading, refreshAccounts, addAccount, updateAccount, deleteAccount } = useAccounts();
    const { installments, addInstallment, payPeriod, cancelInstallment, getPeriods } = useInstallments();
    const refreshAll = useStore(s => s.refreshAll);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'asset' | 'liability'>('asset');
    const [installmentAccount, setInstallmentAccount] = useState<Account | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const handleSync = async () => {
        if (confirm('是否清空现有数据并注入测试预设假数据？')) {
            const ok = await seedDatabase();
            if (ok) {
                await refreshAll();
            } else {
                await refreshAccounts();
                alert('注入测试数据失败，请查看控制台日志。');
            }
        }
    };

    const handleOpenModal = (type: 'asset' | 'liability') => { setModalType(type); setIsModalOpen(true); };

    const handleDeleteCard = async (acc: Account) => {
        if (confirm(`确定删除账户"${acc.name}"吗？\n\n该账户下的所有流水和分期记录也将被一并删除！`)) {
            await deleteAccount(acc.id);
        }
    };

    const [menuCardId, setMenuCardId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuCardId(null); };
        if (menuCardId) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuCardId]);

    const assets = accounts.filter(a => a.type === 'asset');
    const liabilities = accounts.filter(a => a.type === 'liability');
    const totalAssets = assets.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance ?? 0), 0);

    const cashFlowWarnings = useMemo(() => {
        const warnings: { dueAt: Date; daysLeft: number; name: string; amount: number; type: string }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 30);

        const getNextMonthlyDate = (day: number): Date | null => {
            if (!Number.isFinite(day) || day < 1) return null;

            const buildDate = (year: number, month: number) => {
                const lastDay = new Date(year, month + 1, 0).getDate();
                const safeDay = Math.min(day, lastDay);
                const d = new Date(year, month, safeDay);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            let candidate = buildDate(today.getFullYear(), today.getMonth());
            if (candidate < today) {
                candidate = buildDate(today.getFullYear(), today.getMonth() + 1);
            }
            return candidate;
        };

        liabilities.forEach(acc => {
            if (!acc.due_date) return;
            const dueAt = getNextMonthlyDate(acc.due_date);
            if (!dueAt || dueAt > horizon) return;

            const daysLeft = Math.floor((dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            warnings.push({
                dueAt,
                daysLeft,
                name: acc.name,
                amount: Math.abs(acc.balance ?? 0),
                type: '还款',
            });
        });

        installments.filter(i => i.status === 'active').forEach(inst => {
            const acc = accounts.find(a => a.id === inst.account_id);
            const dayOfMonth = new Date(inst.start_date).getDate();
            const dueAt = getNextMonthlyDate(dayOfMonth);
            if (!dueAt || dueAt > horizon) return;

            const daysLeft = Math.floor((dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            warnings.push({
                dueAt,
                daysLeft,
                name: `${acc?.name || '分期'} (${(inst.paid_periods ?? 0) + 1}/${inst.total_periods})`,
                amount: inst.monthly_payment,
                type: '分期',
            });
        });

        return warnings.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    }, [liabilities, installments, accounts]);

    const formatMoney = (n: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n);

    const renderIcon = (_type: string, name: string) => {
        if (name.includes('信用卡') || name.includes('Credit')) return <CreditCard size={24} color="white" />;
        if (name.includes('宝') || name.includes('花呗') || name.includes('微信')) return <Smartphone size={24} color="white" />;
        if (name.includes('白条')) return <Building size={24} color="white" />;
        return <Building2 size={24} color="white" />;
    };

    const renderCard = (acc: Account, isLiability: boolean) => (
        <div key={acc.id} className="motion-hover-lift group h-40 rounded-[var(--radius-xl)] p-6 flex flex-col justify-between relative overflow-hidden text-white cursor-pointer border border-white/20 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[var(--shadow-xl),0_0_20px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${acc.color}, ${acc.color}dd)` }}>
            <div className="flex justify-between items-start z-[1]">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-[4px] rounded-[10px] flex items-center justify-center">
                    {renderIcon(acc.type, acc.name)}
                </div>
                <span className="text-[13px] font-medium opacity-90 uppercase tracking-wider">
                    {isLiability ? (acc.name.includes('信用') ? '信用卡' : '信用分期') : (acc.name.includes('储蓄') ? '储蓄卡' : '数字钱包')}
                </span>
            </div>
            <div className="flex flex-col z-[1]">
                <div className="text-sm opacity-90 mb-1">{acc.name}</div>
                <div className="text-2xl font-bold tracking-tight">{formatMoney(acc.balance ?? 0)}</div>
                {isLiability && acc.due_date && (
                    <div className="text-xs mt-2 bg-black/20 py-1 px-2 rounded-[var(--radius-sm)] inline-block self-start">每月 {acc.due_date} 日还款</div>
                )}
            </div>
            {/* Card Menu */}
            <div className="absolute top-2 right-2 z-[5]" ref={menuCardId === acc.id ? menuRef : undefined}>
                <button className="w-7 h-7 rounded-full border-none bg-white/20 text-white/70 flex items-center justify-center cursor-pointer opacity-0 transition-[opacity,background-color,color,transform] duration-150 backdrop-blur-[4px] group-hover:opacity-100 hover:bg-white/35 hover:text-white"
                    onClick={e => { e.stopPropagation(); setMenuCardId(menuCardId === acc.id ? null : acc.id); }}>
                    <MoreVertical size={16} />
                </button>
                {menuCardId === acc.id && (
                    <div className="motion-dropdown-fade absolute top-[34px] right-0 bg-[var(--bg-surface-solid)] border border-[var(--border-light)] rounded-[var(--radius-md)] shadow-lg min-w-[130px] p-1 backdrop-blur-[20px]">
                        <button className="flex items-center gap-2 w-full py-2 px-3 border-none bg-none text-[13px] text-[var(--text-primary)] cursor-pointer rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-primary-light)]"
                            onClick={() => { setEditingAccount(acc); setMenuCardId(null); }}><Pencil size={13} /> 编辑</button>
                        {isLiability && (
                            <button className="flex items-center gap-2 w-full py-2 px-3 border-none bg-none text-[13px] text-[var(--text-primary)] cursor-pointer rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-primary-light)]"
                                onClick={() => { setInstallmentAccount(acc); setMenuCardId(null); }}><CircleDollarSign size={13} /> 分期管理</button>
                        )}
                        <button className="flex items-center gap-2 w-full py-2 px-3 border-none bg-none text-[13px] text-[var(--color-danger)] cursor-pointer rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-danger-bg)]"
                            onClick={() => { handleDeleteCard(acc); setMenuCardId(null); }}><Trash2 size={13} /> 删除</button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-gradient text-[28px] font-bold tracking-tight mb-1">资产与负债</h1>
                    <p className="text-[var(--text-tertiary)] text-sm">追踪您的资产账户及即将到期的分期账单。</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-secondary glass-panel flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] text-[13px] font-medium text-[var(--text-secondary)] rounded-[var(--radius-md)] cursor-pointer" onClick={handleSync}><RefreshCw size={16} /> 注入测试数据</button>
                    <button className="btn-primary flex items-center gap-1.5 py-2 px-4 border-none text-[13px] font-medium bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] shadow-[0_4px_10px_rgba(79,70,229,0.3)] cursor-pointer" onClick={() => handleOpenModal('asset')}><Plus size={16} /> 添加账户</button>
                </div>
            </header>

            {loading ? (
                <div className="py-10 text-center text-[var(--text-secondary)]">数据加载中...</div>
            ) : (
                <div className="flex flex-col gap-10">
                    {/* Assets */}
                    <section>
                        <h2 className="text-lg font-semibold mb-5 flex items-center gap-3">
                            资金资产 <span className="text-base font-bold text-[var(--color-success)] bg-[var(--color-success-bg)] py-1 px-2.5 rounded-full">{formatMoney(totalAssets)}</span>
                        </h2>
                        <div className="cards-grid grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                            {assets.map(acc => renderCard(acc, false))}
                            <button className="motion-hover-lift h-40 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--border-strong)] bg-white/40 flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary)] font-semibold cursor-pointer hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-white/80 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md),0_0_0_4px_var(--color-primary-light)]"
                                onClick={() => handleOpenModal('asset')}><Plus size={24} /><span>添加资产</span></button>
                        </div>
                    </section>

                    {/* Liabilities */}
                    <section>
                        <h2 className="text-lg font-semibold mb-5 flex items-center gap-3">
                            负债与账单 <span className="text-base font-bold text-[var(--color-danger)] bg-[var(--color-danger-bg)] py-1 px-2.5 rounded-full">{formatMoney(totalLiabilities)}</span>
                        </h2>
                        <div className="cards-grid grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                            {liabilities.map(acc => renderCard(acc, true))}
                            <button className="motion-hover-lift h-40 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--border-strong)] bg-white/40 flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary)] font-semibold cursor-pointer hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-white/80 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md),0_0_0_4px_var(--color-primary-light)]"
                                onClick={() => handleOpenModal('liability')}><Plus size={24} /><span>添加负债</span></button>
                        </div>
                    </section>

                    {/* Cash Flow Warning */}
                    <section className="glass-panel p-6 mt-5">
                        <h3 className="text-base mb-6 text-[var(--text-primary)] font-semibold">未来 30 天现金流预警</h3>
                        {cashFlowWarnings.length === 0 ? (
                            <div className="py-4 text-center text-[var(--text-tertiary)] text-[13px]">暂无即将到期的还款或分期</div>
                        ) : (
                            <div className="px-2">
                                {cashFlowWarnings.map((w, i) => (
                                    <div key={i} className="flex items-center gap-3 py-2.5 px-2 border-b border-[var(--border-light)] text-[13px] rounded-[var(--radius-sm)] transition-[transform,background-color] duration-150 hover:bg-black/[0.02] hover:translate-x-0.5 last:border-b-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-[var(--color-danger)] shadow-[0_0_0_3px_var(--color-danger-bg)]' : 'bg-[var(--border-strong)]'}`} />
                                        <div className="min-w-[120px] text-[var(--text-secondary)] font-medium">{w.dueAt.getMonth() + 1}月{w.dueAt.getDate()}日 ({w.daysLeft === 0 ? '今天' : `${w.daysLeft}天后`})</div>
                                        <div className="flex-1 text-[var(--text-primary)]">{w.name}</div>
                                        <div className="text-[11px] py-0.5 px-1.5 rounded-[10px] bg-[var(--color-primary-light)] text-[var(--color-primary)]">{w.type}</div>
                                        <div className="font-semibold text-[var(--color-danger)] min-w-[80px] text-right">{formatMoney(w.amount)}</div>
                                    </div>
                                ))}
                                <div className="pt-3 text-xs text-[var(--text-tertiary)]">
                                    预计总支出: <strong className="text-[var(--color-danger)]">{formatMoney(cashFlowWarnings.reduce((s, w) => s + w.amount, 0))}</strong>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}

            <AccountModal isOpen={isModalOpen} defaultType={modalType} onClose={() => setIsModalOpen(false)} onSave={addAccount} />
            <InstallmentModal isOpen={!!installmentAccount} account={installmentAccount} installments={installments}
                onClose={() => setInstallmentAccount(null)} onAdd={addInstallment} onPay={payPeriod} onCancel={cancelInstallment} onGetPeriods={getPeriods} />
            <AccountEditModal account={editingAccount} onClose={() => setEditingAccount(null)} onSave={updateAccount} onDelete={deleteAccount} />
        </div>
    );
};
