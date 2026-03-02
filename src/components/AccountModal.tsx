import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Account } from '../api/db';

interface AccountModalProps {
    isOpen: boolean;
    defaultType?: 'asset' | 'liability';
    onClose: () => void;
    onSave: (account: Partial<Account>) => Promise<boolean>;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, defaultType = 'asset', onClose, onSave }) => {
    const [type, setType] = useState<'asset' | 'liability'>(defaultType);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [color, setColor] = useState('#4F46E5');
    const [creditLimit, setCreditLimit] = useState('');
    const [statementDate, setStatementDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setType(defaultType);
            setName(''); setBalance('');
            setColor(defaultType === 'asset' ? '#10B981' : '#F59E0B');
            setCreditLimit(''); setStatementDate(''); setDueDate('');
        }
    }, [isOpen, defaultType]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return alert('请输入账户名称');

        setIsSaving(true);
        const accountData: Partial<Account> = {
            name: name.trim(), type, balance: parseFloat(balance || '0'), color, currency: 'CNY',
        };

        if (type === 'liability') {
            if (creditLimit) accountData.credit_limit = parseFloat(creditLimit);
            if (statementDate) accountData.statement_date = parseInt(statementDate, 10);
            if (dueDate) accountData.due_date = parseInt(dueDate, 10);
            accountData.balance = -Math.abs(parseFloat(balance || '0'));
        } else {
            accountData.balance = Math.abs(parseFloat(balance || '0'));
        }

        try {
            const success = await onSave(accountData);
            if (success) onClose();
            else alert('添加账户失败，请检查填写内容或查看控制台日志');
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('发生异常: ' + (error.message || '未知错误'));
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[440px] max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold">添加账户</h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                        {/* Type Toggle */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">账户类型</label>
                            <div className="flex bg-black/[0.04] p-1 rounded-[var(--radius-md)]">
                                <button type="button" onClick={() => setType('asset')}
                                    className={`flex-1 py-2 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${type === 'asset' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                    资产 (储蓄/数字钱包)
                                </button>
                                <button type="button" onClick={() => setType('liability')}
                                    className={`flex-1 py-2 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${type === 'liability' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                    负债 (信用卡/花贷)
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">账户名称 <span className="text-[var(--color-danger)]">*</span></label>
                            <input type="text" className={inputCls} placeholder="例如: 招商银行储蓄卡, 支付宝花呗" value={name} onChange={e => setName(e.target.value)} autoFocus required />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">{type === 'asset' ? '当前余额' : '当前已用/欠款'} (¥)</label>
                            <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">卡片颜色</label>
                            <div className="flex gap-2 flex-wrap">
                                {['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'].map(c => (
                                    <div key={c} className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                                        style={{ backgroundColor: c, border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                                        onClick={() => setColor(c)} />
                                ))}
                            </div>
                        </div>

                        {type === 'liability' && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[13px] font-medium text-[var(--text-secondary)]">总授信额度 (¥) (选填)</label>
                                    <input type="number" step="1" className={inputCls} placeholder="例如: 50000" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">账单日 (1-31 日)</label>
                                        <input type="number" min="1" max="31" className={inputCls} placeholder="例如: 5" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">还款日 (1-31 日)</label>
                                        <input type="number" min="1" max="31" className={inputCls} placeholder="例如: 25" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-light)]">
                        <button type="button" className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={onClose}>取消</button>
                        <button type="submit" className="btn-primary py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)] disabled:opacity-50" disabled={isSaving}>
                            {isSaving ? '保存中...' : '确认添加'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
