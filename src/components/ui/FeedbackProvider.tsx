import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
    id: string;
    message: string;
    type: ToastType;
};

type ConfirmState = {
    title: string;
    message: string;
};

type FeedbackContextValue = {
    toast: (message: string, type?: ToastType) => void;
    confirm: (title: string, message: string) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const confirmResolver = useRef<((value: boolean) => void) | null>(null);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
        setToasts(prev => [...prev, { id, message, type }]);
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2600);
    }, []);

    const confirm = useCallback((title: string, message: string) => {
        setConfirmState({ title, message });
        return new Promise<boolean>(resolve => {
            confirmResolver.current = resolve;
        });
    }, []);

    const settleConfirm = useCallback((accepted: boolean) => {
        if (confirmResolver.current) {
            confirmResolver.current(accepted);
        }
        confirmResolver.current = null;
        setConfirmState(null);
    }, []);

    const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}

            <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2 pointer-events-none">
                {toasts.map(item => (
                    <div
                        key={item.id}
                        className={`pointer-events-auto min-w-[220px] max-w-[360px] px-3 py-2 rounded-[var(--radius-md)] text-sm shadow-lg border ${
                            item.type === 'success'
                                ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-green-500/20'
                                : item.type === 'error'
                                    ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-red-500/20'
                                    : 'bg-[var(--bg-surface-solid)] text-[var(--text-primary)] border-[var(--border-light)]'
                        }`}
                    >
                        {item.message}
                    </div>
                ))}
            </div>

            {confirmState && (
                <div className="motion-overlay-fade fixed inset-0 z-[2100] bg-black/35 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="glass-panel motion-panel-slide w-[420px] p-5 flex flex-col gap-4">
                        <h3 className="text-base font-semibold">{confirmState.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{confirmState.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" className="btn-secondary py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={() => settleConfirm(false)}>
                                取消
                            </button>
                            <button type="button" className="btn-primary py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] bg-[var(--color-primary)] text-white cursor-pointer" onClick={() => settleConfirm(true)}>
                                确认
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => {
    const ctx = useContext(FeedbackContext);
    if (!ctx) {
        throw new Error('useFeedback must be used within FeedbackProvider');
    }
    return ctx;
};
