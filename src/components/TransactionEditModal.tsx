import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Transaction, Category } from '../api/db';
import { inputDateTimeToStorage, storageDateToInputDateTime } from '../utils/datetime';

interface TransactionEditModalProps {
    isOpen: boolean;
    transaction: Transaction | null;
    categories: Category[];
    accounts: { id: string; name: string; type: string }[];
    onClose: () => void;
    onSave: (id: string, oldTx: Transaction, newData: Partial<Transaction>) => Promise<boolean>;
    onDelete: (tx: Transaction) => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({ isOpen, transaction, categories, accounts, onClose, onSave, onDelete }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && transaction) {
            setAmount(String(Math.abs(transaction.amount)));
            setDescription(transaction.description || '');
            setCategory(transaction.category);
            setAccountId(transaction.account_id);
            setDate(storageDateToInputDateTime(transaction.date));
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    const isExpense = transaction.amount < 0;
    const filteredCategories = categories.filter(c => c.type === (isExpense ? 'expense' : 'income'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return alert('请输入金额');
        setIsSaving(true);
        let numericAmount = parseFloat(amount);
        if (isExpense) numericAmount = -Math.abs(numericAmount);
        else numericAmount = Math.abs(numericAmount);

        try {
            const success = await onSave(transaction.id, transaction, {
                amount: numericAmount,
                description,
                category,
                account_id: accountId,
                date: inputDateTimeToStorage(date),
            });
            if (success) onClose();
            else alert('保存失败');
        } catch (err: any) {
            alert('异常: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[440px] max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold">编辑流水</h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">类型</label>
                            <div className="py-2 text-sm text-[var(--text-secondary)]">
                                {isExpense ? '💸 支出' : '💰 收入'}（类型不可修改，如需更改请删除后重建）
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">金额 (¥)</label>
                            <input type="number" step="0.01" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">分类</label>
                            <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                                {filteredCategories.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
                                {!filteredCategories.some(c => c.name === category) && <option value={category}>{category} (历史)</option>}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">描述</label>
                            <input type="text" className={inputCls} value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">关联账户</label>
                            <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">日期与时间</label>
                            <input type="datetime-local" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-5 border-t border-[var(--border-light)]">
                        <button type="button" className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--color-danger)] cursor-pointer hover:bg-[var(--color-danger-bg)]" onClick={() => { onDelete(transaction); onClose(); }}>删除此笔</button>
                        <div className="flex-1" />
                        <button type="button" className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={onClose}>取消</button>
                        <button type="submit" className="btn-primary py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)] disabled:opacity-50" disabled={isSaving}>{isSaving ? '保存中...' : '保存修改'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
