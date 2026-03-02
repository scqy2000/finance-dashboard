import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, BrainCircuit, MessageSquare, Loader2, TrendingUp, AlertTriangle, Wallet, Trash2 } from 'lucide-react';
import { AIChatService } from '../api/ai';
import { FinanceApi } from '../api/db';
import type { FinanceSnapshot } from '../api/db';
import { nowLocalIso, startOfCurrentMonthLocalIso } from '../utils/datetime';
import { getErrorMessage } from '../utils/errors';
import { useFeedback } from '../components/ui/FeedbackProvider';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

const STORAGE_KEY = 'finance_ai_chat_history';
const DEFAULT_MSG: Message = {
    id: '1', role: 'assistant',
    content: '您好！我是您的 AI 财务顾问。我已加载了您本地的资产、负债和流水数据，可为您提供个性化的预算规划、支出诊断和债务优化建议。\n\n您可以试试问我：\n• 我的财务状况健康吗？\n• 帮我分析一下我的支出结构\n• 如何制定还款优先级？\n• 这个月我还能花多少钱？'
};

const EMPTY_SNAPSHOT: FinanceSnapshot = {
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

function loadMessages(): Message[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* ignore */ }
    return [DEFAULT_MSG];
}

function saveMessages(msgs: Message[]) {
    const clean = msgs.map(m => ({ id: m.id, role: m.role, content: m.content }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export const Analytics: React.FC = () => {
    const { toast, confirm } = useFeedback();
    const [messages, setMessages] = useState<Message[]>(loadMessages);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [snapshot, setSnapshot] = useState<FinanceSnapshot>(EMPTY_SNAPSHOT);
    const [snapshotError, setSnapshotError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isGenerating) saveMessages(messages);
    }, [messages, isGenerating]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        let cancelled = false;

        const loadSnapshot = async () => {
            try {
                const data = await FinanceApi.getSnapshot(startOfCurrentMonthLocalIso(), nowLocalIso(), 0);
                if (!cancelled) {
                    setSnapshot(data);
                    setSnapshotError(null);
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setSnapshotError(getErrorMessage(e, '加载财务快照失败'));
                }
            }
        };

        loadSnapshot();
        return () => { cancelled = true; };
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsGenerating(true);

        const aiMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);

        try {
            const history = messages
                .filter(m => m.id !== '1' && m.id !== aiMsgId && !m.isStreaming)
                .map(m => ({ role: m.role, content: m.content }));

            await AIChatService.sendMessage(userMsg.content, (chunk) => {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: chunk } : m));
            }, history);

            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
        } catch (error: unknown) {
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: `错误：${getErrorMessage(error)}`, isStreaming: false } : m));
            toast('AI 请求失败: ' + getErrorMessage(error), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteMessage = useCallback((msgId: string) => {
        setMessages(prev => {
            const idx = prev.findIndex(m => m.id === msgId);
            if (idx < 0) return prev;

            const msg = prev[idx];
            if (msg.role === 'user' && idx + 1 < prev.length && prev[idx + 1].role === 'assistant') {
                return prev.filter((_, i) => i !== idx && i !== idx + 1);
            }
            if (msg.role === 'assistant' && idx - 1 >= 0 && prev[idx - 1].role === 'user') {
                return prev.filter((_, i) => i !== idx && i !== idx - 1);
            }
            return prev.filter(m => m.id !== msgId);
        });
    }, []);

    const handleClearAll = useCallback(async () => {
        const ok = await confirm('确认清空', '确定清空所有聊天记录吗？');
        if (ok) {
            setMessages([DEFAULT_MSG]);
            toast('聊天记录已清空', 'success');
        }
    }, [confirm, toast]);

    const handleQuickPrompt = (prompt: string) => {
        setInput(prompt);
    };

    const formatMoney = (n: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n);

    const SnapItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
        <div className="flex justify-between items-center py-2 border-b border-[var(--border-light)] last:border-b-0">
            <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
            <span className={`text-sm font-semibold ${color || 'text-[var(--text-primary)]'}`}>{value}</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-gradient text-[28px] font-bold tracking-tight mb-1">AI 财务诊断</h1>
                    <p className="text-[var(--text-tertiary)] text-sm">基于本地账本数据的智能财务顾问。</p>
                </div>
                <div className="flex gap-2">
                    {messages.length > 1 && (
                        <button className="btn-secondary flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] cursor-pointer" onClick={handleClearAll}>
                            <Trash2 size={16} /> 清空记录
                        </button>
                    )}
                    <button className="btn-primary flex items-center gap-1.5 py-2 px-4 border-none rounded-[var(--radius-md)] text-[13px] font-medium text-white cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                        onClick={() => handleQuickPrompt('请给我生成一份本月的综合财务健康报告，包括资产负债概况、支出结构分析、还款建议和节流方案。')}>
                        <Sparkles size={16} /> 生成深度报告
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[2fr_1fr] gap-6 flex-1 min-h-0">
                <div className="glass-panel flex flex-col overflow-hidden">
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                        {messages.map((m, idx) => (
                            <div key={m.id} className={`group flex gap-3 items-start relative ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {m.role === 'assistant' && <BrainCircuit size={20} className="text-[var(--color-primary)] shrink-0 mt-1" />}
                                <div className={`whitespace-pre-wrap text-sm leading-relaxed max-w-[85%] p-4 rounded-[var(--radius-lg)]
                                    ${m.role === 'assistant' ? 'bg-[var(--bg-app)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-tl-sm' : 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-tr-sm'}`}>
                                    {m.content}
                                    {m.isStreaming && <span className="animate-pulse ml-0.5">█</span>}
                                </div>
                                {idx > 0 && !m.isStreaming && !isGenerating && (
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 border-none bg-none text-[var(--text-tertiary)] hover:text-[var(--color-danger)] cursor-pointer p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-danger-bg)]" onClick={() => handleDeleteMessage(m.id)} title="删除此对话">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {messages.length <= 2 && (
                        <div className="flex flex-wrap gap-2 px-6 pb-3">
                            {['分析我的支出结构', '帮我制定还款计划', '我的财务状况如何？', '如何优化我的开支？'].map(p => (
                                <button key={p} className="text-xs py-1.5 px-3 border border-[var(--border-strong)] rounded-full bg-white/50 text-[var(--text-secondary)] cursor-pointer transition-[background-color,color,border-color,transform] duration-150 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                                    onClick={() => handleQuickPrompt(p)}>{p}</button>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 p-4 border-t border-[var(--border-light)]">
                        <input type="text" placeholder="请随时提出财务问题..."
                            className="flex-1 py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white/50 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light)]"
                            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={isGenerating} />
                        <button className="w-10 h-10 rounded-[var(--radius-md)] border-none bg-[var(--color-primary)] text-white flex items-center justify-center cursor-pointer transition-[background-color,box-shadow,transform,opacity] duration-150 hover:shadow-[0_4px_14px_var(--color-primary-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSend} disabled={isGenerating || !input.trim()}>
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="glass-panel p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Wallet size={16} /> 财务快照</h3>
                        <SnapItem label="总资产" value={formatMoney(snapshot.total_assets)} color="text-[var(--color-success)]" />
                        <SnapItem label="总负债" value={formatMoney(snapshot.total_debt)} color="text-[var(--color-danger)]" />
                        <div className="flex justify-between items-center py-2 mt-1 bg-[var(--color-primary-light)] rounded-[var(--radius-sm)] px-2">
                            <span className="text-[13px] font-medium text-[var(--color-primary)]">资产净值</span>
                            <span className="text-sm font-bold text-[var(--color-primary)]">{formatMoney(snapshot.net_worth)}</span>
                        </div>
                    </div>

                    <div className="glass-panel p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><TrendingUp size={16} /> 本月概况</h3>
                        <SnapItem label="本月收入" value={formatMoney(snapshot.period_income)} color="text-[var(--color-success)]" />
                        <SnapItem label="本月支出" value={formatMoney(snapshot.period_expense)} color="text-[var(--color-danger)]" />
                        <SnapItem label="本月结余" value={formatMoney(snapshot.period_income - snapshot.period_expense)}
                            color={snapshot.period_income - snapshot.period_expense >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'} />
                    </div>

                    {snapshot.active_installments > 0 && (
                        <div className="glass-panel p-5 border border-amber-500/30">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-amber-600"><AlertTriangle size={16} /> 分期提醒</h3>
                            <SnapItem label="进行中分期" value={`${snapshot.active_installments} 项`} />
                            <SnapItem label="每月分期还款" value={formatMoney(snapshot.monthly_installment)} color="text-[var(--color-danger)]" />
                        </div>
                    )}

                    <div className="glass-panel p-4 text-xs text-[var(--text-tertiary)]">
                        已接入 {snapshot.account_count} 个账户、{snapshot.transaction_count} 笔流水作为 AI 上下文。请在"设置"中配置 API Key。
                    </div>

                    {snapshotError && (
                        <div className="glass-panel p-3 text-xs text-[var(--color-danger)]">
                            财务快照加载失败：{snapshotError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
