import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, CircleDollarSign, CheckCircle2, Ban, ChevronDown, ChevronUp, ListOrdered, Minus } from 'lucide-react';
import { Installment, InstallmentPeriod, Account } from '../api/db';
import { useFeedback } from './ui/FeedbackProvider';

interface InstallmentModalProps {
    isOpen: boolean;
    account: Account | null;
    installments: Installment[];
    onClose: () => void;
    onAdd: (inst: Partial<Installment>, periodAmounts?: number[], alreadyPaid?: number) => Promise<void>;
    onPay: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
    onGetPeriods?: (installmentId: string) => Promise<InstallmentPeriod[]>;
}

type InputMode = 'equal' | 'custom';

export const InstallmentModal: React.FC<InstallmentModalProps> = ({ isOpen, account, installments, onClose, onAdd, onPay, onCancel, onGetPeriods }) => {
    const { toast } = useFeedback();
    const [showForm, setShowForm] = useState(false);
    const [totalAmount, setTotalAmount] = useState('');
    const [totalPeriods, setTotalPeriods] = useState('12');
    const [interestRate, setInterestRate] = useState('0');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [alreadyPaid, setAlreadyPaid] = useState('0');
    const [inputMode, setInputMode] = useState<InputMode>('equal');
    const [customAmounts, setCustomAmounts] = useState<string[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [periodDetails, setPeriodDetails] = useState<Record<string, InstallmentPeriod[]>>({});

    const accountInstallments = useMemo(() => {
        if (!account) return [];
        return installments.filter(i => i.account_id === account.id);
    }, [account, installments]);

    const periods = parseInt(totalPeriods || '1');

    const monthlyPayment = useMemo(() => {
        const amt = parseFloat(totalAmount || '0');
        const rate = parseFloat(interestRate || '0') / 100;
        if (rate === 0) return amt / periods;
        return (amt * rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1);
    }, [totalAmount, totalPeriods, interestRate, periods]);

    useEffect(() => {
        if (inputMode === 'custom') {
            setCustomAmounts(prev => {
                const newArr = Array.from({ length: periods }, (_, i) => prev[i] || '');
                return newArr;
            });
        }
    }, [periods, inputMode]);

    const toggleExpand = async (instId: string) => {
        // 明细按需加载，避免初次打开弹窗就请求所有分期详情。
        if (expandedId === instId) { setExpandedId(null); return; }
        setExpandedId(instId);
        if (!periodDetails[instId] && onGetPeriods) {
            const details = await onGetPeriods(instId);
            setPeriodDetails(prev => ({ ...prev, [instId]: details }));
        }
    };

    const customTotal = useMemo(() => {
        return customAmounts.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    }, [customAmounts]);

    const formatMoney = (n: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n);
    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    if (!isOpen || !account) return null;

    const handleCreate = async () => {
        if (!totalAmount || parseFloat(totalAmount) <= 0) {
            toast('请输入分期总金额', 'error');
            return;
        }
        const paidCount = parseInt(alreadyPaid || '0');
        if (paidCount >= periods) {
            toast('已还期数不能大于等于总期数', 'error');
            return;
        }

        if (inputMode === 'custom') {
            const expected = parseFloat(totalAmount || '0');
            if (Math.abs(customTotal - expected) > 0.01) {
                toast('自定义每期金额合计需与分期总金额一致', 'error');
                return;
            }
        }

        let periodAmounts: number[] | undefined;
        if (inputMode === 'custom') {
            // 自定义模式允许局部留空：留空项回退为当前估算月供。
            periodAmounts = customAmounts.map((v) => {
                const parsed = parseFloat(v);
                return isNaN(parsed) ? Math.round(monthlyPayment * 100) / 100 : parsed;
            });
        }

        await onAdd({
            account_id: account.id,
            total_amount: parseFloat(totalAmount),
            total_periods: periods,
            monthly_payment: Math.round(monthlyPayment * 100) / 100,
            interest_rate: parseFloat(interestRate || '0'),
            start_date: startDate,
            description: description || `${account.name} 分期`,
        }, periodAmounts, paidCount > 0 ? paidCount : undefined);
        toast('分期计划已创建', 'success');
        setShowForm(false);
        setTotalAmount(''); setDescription(''); setAlreadyPaid('0'); setInputMode('equal'); setCustomAmounts([]);
    };

    const handleCustomAmountChange = (index: number, value: string) => {
        setCustomAmounts(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };


    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[620px] max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark,#3730a3)] text-white">
                            <CircleDollarSign size={18} />
                        </span>
                        <span>{account.name} <span className="font-normal text-[var(--text-secondary)] text-sm">分期管理</span></span>
                    </h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="overflow-y-auto p-4 px-5 max-h-[60vh]">

                    {/* Empty state */}
                    {accountInstallments.length === 0 && !showForm && (
                        <div className="py-10 px-6 text-center">
                            <div className="motion-float-soft inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-gradient-to-br from-[var(--color-primary-light)] to-[rgba(99,102,241,0.08)] mb-4">
                                <CircleDollarSign size={30} className="text-[var(--color-primary)] opacity-60" />
                            </div>
                            <div className="text-base font-semibold text-[var(--text-primary)] mb-2">还没有分期计划</div>
                            <div className="text-[13px] text-[var(--text-tertiary)] leading-[1.7] max-w-[320px] mx-auto">
                                管理「{account.name}」的分期还款<br />
                                支持 <strong className="text-[var(--text-secondary)]">等额</strong> 或 <strong className="text-[var(--text-secondary)]">自定义每期金额</strong>，还可导入已有分期
                            </div>
                        </div>
                    )}

                    {/* Existing installment cards */}
                    {accountInstallments.map((inst, idx) => {
                        const progress = inst.total_periods > 0 ? ((inst.paid_periods ?? 0) / inst.total_periods) * 100 : 0;
                        const remaining = inst.total_periods - (inst.paid_periods ?? 0);
                        const remainingAmount = remaining * inst.monthly_payment;
                        const isActive = inst.status === 'active';
                        const isCompleted = inst.status === 'completed';

                        return (
                            <div key={inst.id} className="p-4 mb-3 rounded-[14px] border transition-[border-color,background-color,box-shadow,transform] duration-200"
                                style={{
                                    borderColor: isCompleted ? 'rgba(34,197,94,0.2)' : isActive ? 'rgba(99,102,241,0.15)' : 'var(--border-light)',
                                    background: isCompleted ? 'linear-gradient(135deg, rgba(34,197,94,0.04), rgba(34,197,94,0.08))' : isActive ? 'var(--bg-surface)' : 'rgba(0,0,0,0.02)',
                                    animation: `fadeIn 0.3s ease ${idx * 0.05}s both`
                                }}>
                                {/* Header row */}
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-sm"
                                            style={{ background: isCompleted ? 'rgba(34,197,94,0.12)' : 'var(--color-primary-light)' }}>
                                            {isCompleted ? '✅' : '📋'}
                                        </span>
                                        <strong className="text-sm">{inst.description || '分期计划'}</strong>
                                    </div>
                                    <span className="text-[11px] py-0.5 px-2.5 rounded-full font-medium tracking-wider"
                                        style={{
                                            background: isActive ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #4338ca))' : isCompleted ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)',
                                            color: isActive ? 'white' : isCompleted ? '#16a34a' : 'var(--text-tertiary)'
                                        }}>
                                        {isActive ? '进行中' : isCompleted ? '已结清' : '已取消'}
                                    </span>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {[
                                        { label: '总额', value: formatMoney(inst.total_amount) },
                                        { label: '每期', value: formatMoney(inst.monthly_payment) },
                                        { label: '进度', value: `${inst.paid_periods ?? 0}/${inst.total_periods} 期` }
                                    ].map(s => (
                                        <div key={s.label} className="p-2 px-2.5 rounded-lg bg-black/[0.02] border border-black/[0.04]">
                                            <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">{s.label}</div>
                                            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{s.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden relative">
                                    <div className="h-full rounded-full transition-[width] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]"
                                        style={{
                                            width: `${progress}%`,
                                            background: isCompleted ? 'linear-gradient(90deg, #22c55e, #4ade80)' : `linear-gradient(90deg, var(--color-primary), #818cf8)`
                                        }} />
                                </div>
                                {isActive && remaining > 0 && (
                                    <div className="text-[11px] text-[var(--text-tertiary)] mt-1 text-right">
                                        剩余 <strong className="text-[var(--text-secondary)]">{remaining}</strong> 期 · 约 {formatMoney(remainingAmount)}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2 mt-3 justify-between items-center">
                                    <button onClick={() => toggleExpand(inst.id)}
                                        className={`inline-flex items-center gap-1 text-xs py-1 px-3 rounded-lg border border-[var(--border-light)] cursor-pointer transition-[background-color,color,border-color,box-shadow] duration-150 ${expandedId === inst.id ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                        {expandedId === inst.id ? <><ChevronUp size={12} /> 收起</> : <><ChevronDown size={12} /> 每期明细</>}
                                    </button>
                                    {isActive && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => onPay(inst.id)}
                                                className="inline-flex items-center gap-1 text-xs py-1 px-3 rounded-lg border-none bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark,#4338ca)] text-white cursor-pointer shadow-[0_2px_8px_rgba(99,102,241,0.25)]">
                                                <CheckCircle2 size={12} /> 记一期还款
                                            </button>
                                            <button onClick={() => { if (confirm('确定取消该分期计划？')) onCancel(inst.id); }}
                                                className="inline-flex items-center gap-1 text-xs py-1 px-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] text-red-500 cursor-pointer">
                                                <Ban size={12} /> 取消
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Period details */}
                                {expandedId === inst.id && (
                                    <div className="motion-fade-in mt-3 pt-3 border-t border-dashed border-[var(--border-light)]">
                                        {periodDetails[inst.id] ? (
                                            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1.5">
                                                {periodDetails[inst.id].map(p => (
                                                    <div key={p.id} className="p-2 px-2.5 rounded-lg text-xs transition-[background-color,border-color,color] duration-150"
                                                        style={{
                                                            background: p.status === 'paid' ? 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.12))' : 'rgba(0,0,0,0.02)',
                                                            border: `1px solid ${p.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.05)'}`,
                                                        }}>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-[var(--text-secondary)]">第{p.period_number}期</span>
                                                            {p.status === 'paid' && <span className="text-[10px] py-px px-1.5 rounded bg-green-500/15 text-green-600 font-medium">已还</span>}
                                                        </div>
                                                        <div className={`text-[13px] font-semibold mt-0.5 ${p.status === 'paid' ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
                                                            {formatMoney(p.amount)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-3 text-[var(--text-tertiary)] text-[13px]">
                                                <div className="animate-spin inline-block mb-1">⏳</div><br />加载中...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Create form */}
                    {showForm && (
                        <div className="motion-fade-in p-5 rounded-[14px] bg-gradient-to-br from-[rgba(99,102,241,0.04)] to-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.12)]">
                            <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-[var(--color-primary)]" /> 创建新分期
                            </h3>

                            {/* Mode toggle */}
                            <div className="flex mb-4 rounded-[10px] overflow-hidden border border-[var(--border-light)] bg-black/[0.02]">
                                {(['equal', 'custom'] as InputMode[]).map(mode => (
                                    <button key={mode} onClick={() => setInputMode(mode)}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium py-2 border-none cursor-pointer transition-[background-color,color,box-shadow,transform] duration-200
                                        ${inputMode === mode ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark,#4338ca)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                        {mode === 'equal' ? <><Minus size={14} /> 等额分期</> : <><ListOrdered size={14} /> 自定义每期</>}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-1.5 mb-3">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">分期总金额 (¥)</label>
                                <input type="number" step="0.01" className={inputCls} placeholder="例如: 12000" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                            </div>
                            <div className="flex gap-3 mb-3">
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">总期数</label>
                                    <input type="number" min="1" max="60" className={inputCls} value={totalPeriods} onChange={e => setTotalPeriods(e.target.value)} placeholder="12" />
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">已还期数 <span className="text-[10px] text-[var(--text-tertiary)] font-normal">导入已有分期</span></label>
                                    <input type="number" min="0" max={periods - 1} className={inputCls} placeholder="0" value={alreadyPaid} onChange={e => setAlreadyPaid(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 mb-3">
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">月费率 (%)</label>
                                    <input type="number" step="0.01" className={inputCls} placeholder="0 = 免息" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">起始日期</label>
                                    <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 mb-3">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">备注 (选填)</label>
                                <input type="text" className={inputCls} placeholder="例如: iPhone 16 分期" value={description} onChange={e => setDescription(e.target.value)} />
                            </div>

                            {/* Equal mode preview card */}
                            {inputMode === 'equal' && totalAmount && (
                                <div className="motion-fade-in p-3 px-4 rounded-[10px] bg-gradient-to-br from-[rgba(99,102,241,0.06)] to-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.15)] mb-3">
                                    <div className="text-xs text-[var(--text-tertiary)] mb-1">预估每期还款</div>
                                    <div className="text-lg font-bold text-[var(--color-primary)]">{formatMoney(monthlyPayment)}</div>
                                    {parseInt(alreadyPaid) > 0 && (
                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                            剩余 <strong>{periods - parseInt(alreadyPaid)}</strong> 期 · 约 {formatMoney(monthlyPayment * (periods - parseInt(alreadyPaid)))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Custom amounts grid */}
                            {inputMode === 'custom' && (
                                <div className="motion-fade-in mb-3">
                                    <div className="flex justify-between items-center mb-2.5">
                                        <label className="text-[13px] font-semibold">每期金额明细</label>
                                        <span className={`text-xs py-0.5 px-2.5 rounded-md ${customTotal > 0 ? 'bg-[rgba(99,102,241,0.08)] text-[var(--color-primary)]' : 'bg-black/[0.03] text-[var(--text-tertiary)]'}`}>
                                            合计: {formatMoney(customTotal)}
                                            {totalAmount && (
                                                <span className={`ml-1.5 font-semibold ${Math.abs(customTotal - parseFloat(totalAmount)) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {Math.abs(customTotal - parseFloat(totalAmount)) < 0.01 ? '✓' : `差 ${formatMoney(Math.abs(parseFloat(totalAmount) - customTotal))}`}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto grid grid-cols-2 gap-1.5 p-0.5">
                                        {customAmounts.map((val, i) => {
                                            const isPaid = i < parseInt(alreadyPaid || '0');
                                            return (
                                                <div key={i} className={`flex items-center gap-1.5 p-1 px-2 rounded-lg transition-[background-color,border-color,color] duration-150 ${isPaid ? 'bg-green-500/[0.06] border border-green-500/15' : 'bg-black/[0.02] border border-black/[0.04]'}`}>
                                                    <span className={`text-[11px] min-w-[32px] font-semibold ${isPaid ? 'text-green-600' : 'text-[var(--text-tertiary)]'}`}>
                                                        {isPaid ? '✓' : ''}{i + 1}期
                                                    </span>
                                                    <input type="number" step="0.01" className={inputCls}
                                                        style={{ fontSize: '12px', padding: '4px 8px', background: isPaid ? 'rgba(34,197,94,0.04)' : undefined }}
                                                        placeholder={monthlyPayment ? monthlyPayment.toFixed(2) : '0'}
                                                        value={val}
                                                        onChange={e => handleCustomAmountChange(i, e.target.value)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => { if (!totalAmount) return; const avg = parseFloat(totalAmount) / periods; setCustomAmounts(Array.from({ length: periods }, () => avg.toFixed(2))); }}
                                        className="inline-flex items-center gap-1 text-[11px] py-1 px-3 mt-2 rounded-md border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] cursor-pointer transition-[background-color,color,border-color] duration-150 hover:bg-[var(--bg-surface-hover)]">
                                        ⚡ 均分填充
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end mt-1">
                                <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={() => { setShowForm(false); setInputMode('equal'); setCustomAmounts([]); }}>取消</button>
                                <button className="py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_2px_8px_rgba(99,102,241,0.3)]" onClick={handleCreate}>确认创建</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 p-5 border-t border-[var(--border-light)]">
                    {!showForm && (
                        <button className="flex items-center gap-1.5 py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
                            onClick={() => setShowForm(true)}>
                            <Plus size={16} /> 新建分期计划
                        </button>
                    )}
                    <div className="flex-1" />
                    <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={onClose}>关闭</button>
                </div>
            </div>
        </div>
    );
};
