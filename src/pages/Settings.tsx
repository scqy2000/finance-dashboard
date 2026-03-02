import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Server, Cpu, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { SecureConfigApi } from '../api/db';
import { getErrorMessage } from '../utils/errors';
import { useFeedback } from '../components/ui/FeedbackProvider';

export const Settings: React.FC = () => {
    const { toast, confirm } = useFeedback();
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
    const [model, setModel] = useState('gpt-4o');
    const [appName, setAppName] = useState('FinancePro');
    const [appShort, setAppShort] = useState('FP');
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [bgStyle, setBgStyle] = useState('solid');
    const [saved, setSaved] = useState(false);

    const [appInfo, setAppInfo] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        const storedApiKey = localStorage.getItem('finance_ai_api_key');
        const storedBaseUrl = localStorage.getItem('finance_ai_base_url');
        const storedModel = localStorage.getItem('finance_ai_model');
        const storedAppName = localStorage.getItem('finance_app_name');
        const storedAppShort = localStorage.getItem('finance_app_short');
        const storedThemeColor = localStorage.getItem('finance_theme_color');
        const storedBgStyle = localStorage.getItem('finance_bg_style');

        if (storedBaseUrl) setBaseUrl(storedBaseUrl);
        if (storedModel) setModel(storedModel);
        if (storedAppName) setAppName(storedAppName);
        if (storedAppShort) setAppShort(storedAppShort);
        if (storedThemeColor) setThemeColor(storedThemeColor);
        if (storedBgStyle) setBgStyle(storedBgStyle);

        const loadSecureApiKey = async () => {
            try {
                const secureApiKey = await SecureConfigApi.loadApiKey();
                if (secureApiKey && mounted) {
                    setApiKey(secureApiKey);
                    return;
                }

                if (storedApiKey) {
                    if (mounted) setApiKey(storedApiKey);
                    await SecureConfigApi.saveApiKey(storedApiKey);
                    localStorage.removeItem('finance_ai_api_key');
                }
            } catch {
                if (storedApiKey && mounted) {
                    setApiKey(storedApiKey);
                }
            }
        };

        loadSecureApiKey();
        invoke('get_app_info').then(setAppInfo).catch(() => { });

        return () => {
            mounted = false;
        };
    }, []);

    const handleSave = async () => {
        try {
            await SecureConfigApi.saveApiKey(apiKey);
            localStorage.removeItem('finance_ai_api_key');
            localStorage.setItem('finance_ai_base_url', baseUrl);
            localStorage.setItem('finance_ai_model', model);
            localStorage.setItem('finance_app_name', appName);
            localStorage.setItem('finance_app_short', appShort);
            localStorage.setItem('finance_theme_color', themeColor);
            localStorage.setItem('finance_bg_style', bgStyle);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('branding-updated'));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            toast('设置已保存', 'success');
        } catch (e: unknown) {
            toast('保存失败: ' + getErrorMessage(e), 'error');
        }
    };

    const handleClear = async () => {
        const ok = await confirm('确认清除', '确定要清除所有本地保存的 API 配置吗？');
        if (ok) {
            try {
                await SecureConfigApi.clearApiKey();
            } catch {
                // ignore clear error to avoid blocking local reset
            }
            localStorage.removeItem('finance_ai_api_key');
            localStorage.removeItem('finance_ai_base_url');
            localStorage.removeItem('finance_ai_model');
            setApiKey('');
            setBaseUrl('https://api.openai.com/v1');
            setModel('gpt-4o');
            toast('配置已清除', 'success');
        }
    };



    const inputCls = "w-full py-2.5 px-3.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";
    const sectionCls = "glass-panel p-6 flex flex-col gap-4";

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-gradient text-[28px] font-bold tracking-tight mb-1">系统设置</h1>
                <p className="text-[var(--text-tertiary)] text-sm">配置应用偏好及大模型接口参数。</p>
            </header>

            <div className="flex flex-col gap-6 max-w-3xl">
                {/* Appearance */}
                <section className={sectionCls}>
                    <h2 className="text-base font-semibold mb-2">外观与个性化</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">应用名称</label>
                            <input type="text" className={inputCls} placeholder="例如: MyFinance" value={appName} onChange={e => setAppName(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-secondary)]">侧栏缩写 (1-3字符)</label>
                            <input type="text" className={inputCls} maxLength={3} placeholder="FP" value={appShort} onChange={e => setAppShort(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">主题强调色</label>
                        <div className="flex gap-3">
                            {[
                                { color: '#4f46e5', name: '靛蓝' },
                                { color: '#10b981', name: '翠绿' },
                                { color: '#ef4444', name: '玫瑰' },
                                { color: '#f59e0b', name: '琥珀' },
                                { color: '#8b5cf6', name: '星黛' }
                            ].map(t => (
                                <button key={t.color}
                                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${themeColor === t.color ? 'border-[var(--text-primary)] scale-110 shadow-lg' : 'border-transparent'}`}
                                    style={{ backgroundColor: t.color }} title={t.name}
                                    onClick={() => setThemeColor(t.color)}>
                                    {themeColor === t.color && <CheckCircle2 size={14} color="white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">背景材质</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: 'solid', name: '沉静灰白', style: { background: '#f4f6fa' } },
                                { id: 'gradient-blue', name: '极光紫蓝', style: { background: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)' } },
                                { id: 'gradient-purple', name: '落霞粉黄', style: { background: 'linear-gradient(to right, #fa709a 0%, #fee140 100%)' } },
                                { id: 'mesh', name: '暗夜流光', style: { background: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)', color: 'white' } }
                            ].map(b => (
                                <button key={b.id}
                                    className={`h-16 rounded-[var(--radius-md)] border-2 flex items-end justify-center pb-1.5 text-[11px] font-medium cursor-pointer transition-[transform,box-shadow,border-color,opacity] duration-150 hover:shadow-md ${bgStyle === b.id ? 'border-[var(--color-primary)] shadow-lg scale-[1.02]' : 'border-transparent'}`}
                                    style={b.style} title={b.name}
                                    onClick={() => setBgStyle(b.id)}>
                                    <span className={bgStyle === b.id ? 'opacity-100' : 'opacity-70'}>{b.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[var(--border-light)] mt-2">
                        <button className="btn-primary flex items-center gap-1.5 py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)]" onClick={handleSave}>
                            {saved ? <><CheckCircle2 size={16} /> 已应用并保存</> : <><Save size={16} /> 保存个性化设定</>}
                        </button>
                    </div>
                </section>

                {/* AI Config */}
                <section className={sectionCls}>
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-2"><SettingsIcon size={20} /> AI 引擎配置 (OpenAI 兼容)</h2>
                    <p className="text-sm text-[var(--text-tertiary)] mb-4">
                        请输入您的模型服务商提供的 API 凭证。API Key 将保存在系统凭据管理器中，其他参数保存在当前设备本地。
                    </p>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1"><Server size={14} /> Base URL (接口地址)</label>
                        <input type="text" className={inputCls} placeholder="例如: https://api.deepseek.com/v1" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1"><Key size={14} /> API Key (访问密钥)</label>
                        <input type="password" className={inputCls} placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1"><Cpu size={14} /> Model (模型名称)</label>
                        <input type="text" className={inputCls} placeholder="例如: gpt-4o, deepseek-chat" value={model} onChange={e => setModel(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                        <button className="btn-secondary flex items-center gap-1.5 py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={handleClear}><Trash2 size={16} /> 清除配置</button>
                        <button className="btn-primary flex items-center gap-1.5 py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)]" onClick={handleSave}>
                            {saved ? <><CheckCircle2 size={16} /> 已保存</> : <><Save size={16} /> 保存设定</>}
                        </button>
                    </div>
                </section>

                {/* About */}
                <section className={`${sectionCls} opacity-70`}>
                    <h2 className="text-base font-semibold">关于</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {appName} v{appInfo?.version || '0.1.0'}
                        <br /><br />
                        以 Tauri v2 + React + Rust + SQLite 构建的纯本地数据桌面记账软件。
                    </p>
                </section>
            </div>
        </div>
    );
};
