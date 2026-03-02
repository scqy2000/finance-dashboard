import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ActionMenuProps {
    onEdit: () => void;
    onDelete: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ onEdit, onDelete }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handler);
        }

        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button type="button" className="border-none bg-none text-[var(--text-tertiary)] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer hover:text-[var(--text-primary)] hover:bg-black/5" onClick={e => { e.stopPropagation(); setOpen(!open); }} title="操作">
                <MoreVertical size={16} />
            </button>
            {open && (
                <div className="motion-dropdown-fade absolute right-0 top-full bg-[var(--bg-surface-solid)] border border-[var(--border-light)] rounded-[var(--radius-md)] shadow-lg z-[100] min-w-[120px] p-1 backdrop-blur-[20px]">
                    <button type="button" className="flex items-center gap-2 w-full py-2 px-3 border-none bg-none text-[13px] text-[var(--text-primary)] cursor-pointer rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]" onClick={() => { onEdit(); setOpen(false); }}><Pencil size={13} /> 编辑</button>
                    <button type="button" className="flex items-center gap-2 w-full py-2 px-3 border-none bg-none text-[13px] text-[var(--color-danger)] cursor-pointer rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--color-danger-bg)]" onClick={() => { onDelete(); setOpen(false); }}><Trash2 size={13} /> 删除</button>
                </div>
            )}
        </div>
    );
};
