import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Category } from '../api/db';

interface CategoryManagerProps {
    isOpen: boolean;
    categories: Category[];
    onClose: () => void;
    onAdd: (cat: Partial<Category>) => Promise<void>;
    onUpdate: (id: string, data: Partial<Category>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, categories, onClose, onAdd, onUpdate, onDelete }) => {
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmoji, setNewEmoji] = useState('💰');

    if (!isOpen) return null;

    const filtered = categories.filter(c => c.type === activeTab);
    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    const handleAdd = async () => {
        if (!newName.trim()) return;
        await onAdd({ name: newName.trim(), type: activeTab, emoji: newEmoji || '💰' });
        setNewName(''); setNewEmoji('💰'); setShowAddDialog(false);
    };

    const handleStartEdit = (cat: Category) => {
        setEditingId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji ?? '💰');
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        await onUpdate(editingId, { name: editName.trim(), emoji: editEmoji });
        setEditingId(null);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`确定删除分类"${name}"吗？已使用该分类的历史流水不会受影响。`)) {
            await onDelete(id);
        }
    };

    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[520px] max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold">管理分类</h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-4 px-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex bg-black/[0.04] p-1 rounded-[var(--radius-md)]">
                            <button type="button" onClick={() => setActiveTab('expense')}
                                className={`py-1.5 px-4 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${activeTab === 'expense' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                支出分类
                            </button>
                            <button type="button" onClick={() => setActiveTab('income')}
                                className={`py-1.5 px-4 border-none rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 cursor-pointer ${activeTab === 'income' ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_2px_8px_var(--color-primary-glow)]' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                                收入分类
                            </button>
                        </div>
                        <button className="flex items-center gap-1 py-1.5 px-3.5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                            onClick={() => setShowAddDialog(true)}>
                            <Plus size={14} /> 新增
                        </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {filtered.map(cat => (
                            <div key={cat.id} className="flex items-center py-2.5 px-2 border-b border-[var(--border-light)] gap-2">
                                {editingId === cat.id ? (
                                    <>
                                        <input type="text" className={`${inputCls} !w-[50px] text-center !p-1`} value={editEmoji} onChange={e => setEditEmoji(e.target.value)} />
                                        <input type="text" className={`${inputCls} flex-1 !p-1 !px-2`} value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} />
                                        <button className="border-none bg-none cursor-pointer p-1 text-[var(--color-success)]" onClick={handleSaveEdit}><Check size={16} /></button>
                                        <button className="border-none bg-none cursor-pointer p-1 text-[var(--text-tertiary)]" onClick={() => setEditingId(null)}><X size={16} /></button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg w-[30px] text-center">{cat.emoji}</span>
                                        <span className="flex-1 text-sm">{cat.name}</span>
                                        <button className="border-none bg-none cursor-pointer p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => handleStartEdit(cat)}><Pencil size={14} /></button>
                                        <button className="border-none bg-none cursor-pointer p-1 text-[var(--text-tertiary)] hover:text-[var(--color-danger)]" onClick={() => handleDelete(cat.id, cat.name)}><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="py-5 text-center text-[var(--text-tertiary)]">暂无分类</div>}
                    </div>
                </div>
                <div className="flex justify-end p-5 border-t border-[var(--border-light)]">
                    <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={onClose}>关闭</button>
                </div>
            </div>

            {/* Add Category Sub-Dialog */}
            {showAddDialog && (
                <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-[1100]" onClick={() => setShowAddDialog(false)}>
                    <div className="glass-panel motion-panel-slide w-[380px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                            <h2 className="text-base font-semibold">新增{activeTab === 'expense' ? '支出' : '收入'}分类</h2>
                            <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => setShowAddDialog(false)}><X size={18} /></button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">图标 (Emoji)</label>
                                <input type="text" className={`${inputCls} text-center !text-2xl`} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="💰" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">分类名称</label>
                                <input type="text" className={inputCls} value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：宠物花销" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-light)]">
                            <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={() => setShowAddDialog(false)}>取消</button>
                            <button className="py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_2px_8px_rgba(79,70,229,0.3)] disabled:opacity-50" onClick={handleAdd} disabled={!newName.trim()}>确认添加</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
