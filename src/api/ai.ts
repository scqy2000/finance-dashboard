import { AccountsApi, FinanceApi, SecureConfigApi } from './db';
import { nowLocalIso, startOfCurrentMonthLocalIso } from '../utils/datetime';

const getSystemPrompt = () => {
    return `你是一位专业的个人理财顾问机器人。
你的任务是根据用户提供的真实财务数据（本地 SQLite 读取）为用户提供财务健康诊断、债务优化建议和预算规划。
请用清晰、亲切、通俗易懂的中文回答。不要编造数据，要严格基于用户当前的财务状况。`;
};

export const AIChatService = {
    async sendMessage(userMessage: string, onChunk?: (text: string) => void, history?: { role: string; content: string }[]): Promise<string> {
        // 1. Get configs
        const apiKey = await SecureConfigApi.loadApiKey();
        const baseUrl = localStorage.getItem('finance_ai_base_url') || 'https://api.openai.com/v1';
        const model = localStorage.getItem('finance_ai_model') || 'gpt-4o';

        if (!apiKey) {
            throw new Error('未配置 API 密钥。请到“设置”页面进行配置。');
        }

        // 2. Gather Context
        // 先拉取聚合快照，再补账户明细，避免直接拉取大量流水导致 token 膨胀。
        const [accounts, snapshot] = await Promise.all([
            AccountsApi.getAll(),
            FinanceApi.getSnapshot(startOfCurrentMonthLocalIso(), nowLocalIso(), 12),
        ]);

        const assets = accounts.filter(a => a.type === 'asset');
        const liabilities = accounts.filter(a => a.type === 'liability');

        const contextInfo = `
【用户当前财务上下文】
总资产: ¥${snapshot.total_assets}
总负债: ¥${snapshot.total_debt}
资产净值: ¥${snapshot.net_worth}
本月收入: ¥${snapshot.period_income}
本月支出: ¥${snapshot.period_expense}
本月结余: ¥${snapshot.period_income - snapshot.period_expense}
每月分期还款: ¥${snapshot.monthly_installment}
进行中分期: ${snapshot.active_installments} 项
账户数量: ${snapshot.account_count}
流水总数: ${snapshot.transaction_count}

各资产账户明细:
${assets.length > 0 ? assets.map(a => `- ${a.name}: ¥${a.balance ?? 0}`).join('\n') : '- 无'}

各欠款明细:
${liabilities.length > 0 ? liabilities.map(a => `- ${a.name}: 欠款 ¥${Math.abs(a.balance ?? 0)} (出账日:${a.statement_date || '无'}, 还款日:${a.due_date || '无'})`).join('\n') : '- 无'}

最近流水（最多 12 笔）:
${snapshot.recent_transactions.length > 0 ? snapshot.recent_transactions.map(t => `- [${t.date.split('T')[0]}] ${t.category} ${t.amount < 0 ? '支出' : '收入'} ¥${Math.abs(t.amount)} (${t.description || ''})`).join('\n') : '- 无'}
`;

        // 3. Prepare Payload with multi-turn history
        const messages: { role: string; content: string }[] = [
            { role: 'system', content: getSystemPrompt() + '\n' + contextInfo },
        ];
        // 限制历史窗口，防止上下文过长导致响应变慢或超 token。
        if (history && history.length > 0) {
            const recentHistory = history.slice(-20); // last 20 messages (10 turns)
            messages.push(...recentHistory);
        }
        messages.push({ role: 'user', content: userMessage });

        try {
            const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: !!onChunk,
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || '请求失败');
            }

            if (!onChunk) {
                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                // Robust SSE stream handling (compatible with OpenAI, Zhipu, DeepSeek, etc.)
                const reader = response.body?.getReader();
                const decoder = new TextDecoder('utf-8');
                let fullText = '';
                // 跨 chunk 缓冲区：避免 JSON 被截断时解析失败。
                let buffer = '';

                if (reader) {
                    let streamDone = false;
                    while (!streamDone) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // 按行切分 SSE 帧，最后一段可能不完整，留到下一轮拼接。
                        const parts = buffer.split('\n');
                        buffer = parts.pop() || ''; // Keep the potentially incomplete last part

                        for (const rawLine of parts) {
                            const line = rawLine.trim();
                            if (!line) continue;

                            // Check for stream end marker
                            if (line === 'data: [DONE]' || line === 'data:[DONE]') {
                                streamDone = true;
                                break;
                            }

                            // Extract JSON payload from "data: {...}" or "data:{...}"
                            let jsonStr = '';
                            if (line.startsWith('data: ')) {
                                jsonStr = line.slice(6);
                            } else if (line.startsWith('data:')) {
                                jsonStr = line.slice(5);
                            } else {
                                continue; // Skip non-data lines (e.g. "event:", "id:", ":")
                            }

                            if (!jsonStr.trim()) continue;

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const token = parsed.choices?.[0]?.delta?.content || '';
                                if (token) {
                                    fullText += token;
                                    onChunk(fullText);
                                }
                            } catch (e) {
                                console.warn('SSE parse skip:', jsonStr.slice(0, 80));
                            }
                        }
                    }
                }
                return fullText;
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            throw error;
        }
    }
};
