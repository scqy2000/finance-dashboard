import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { AppSettingsApi, SystemApi } from '../api/client';
import type { AppInfo, TemplateAppSnapshot } from '../api/types';
import { useFeedback } from '../components/ui/FeedbackProvider';
import { refreshTemplateRuntime } from '../store/runtime';
import { downloadTextFile } from '../utils/download';
import {
    DEFAULT_APPEARANCE,
    DEFAULT_BRANDING,
    STORAGE_KEYS,
    applyTheme,
    dispatchTemplateAppearanceEvents,
} from '../utils/preferences';
import { getErrorMessage } from '../utils/errors';
import { exportTemplateSnapshot, importTemplateSnapshot } from '../utils/snapshot';

const NOTE_SETTING_KEY = 'template_workspace_note';

const backgroundOptions = [
    { label: 'Paper', value: 'paper' },
    { label: 'Sunrise', value: 'sunrise' },
    { label: 'Atlas', value: 'atlas' },
    { label: 'Mesh', value: 'mesh' },
];

export function Settings() {
    const { toast } = useFeedback();
    const [appName, setAppName] = useState(DEFAULT_BRANDING.appName);
    const [appShortName, setAppShortName] = useState(DEFAULT_BRANDING.appShortName);
    const [themeColor, setThemeColor] = useState(DEFAULT_APPEARANCE.themeColor);
    const [backgroundStyle, setBackgroundStyle] = useState(DEFAULT_APPEARANCE.backgroundStyle);
    const [workspaceNote, setWorkspaceNote] = useState('');
    const [noteLoading, setNoteLoading] = useState(true);
    const [noteSaving, setNoteSaving] = useState(false);
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setAppName(localStorage.getItem(STORAGE_KEYS.appName) || DEFAULT_BRANDING.appName);
        setAppShortName(localStorage.getItem(STORAGE_KEYS.appShortName) || DEFAULT_BRANDING.appShortName);
        setThemeColor(localStorage.getItem(STORAGE_KEYS.themeColor) || DEFAULT_APPEARANCE.themeColor);
        setBackgroundStyle((localStorage.getItem(STORAGE_KEYS.backgroundStyle) as typeof backgroundStyle) || DEFAULT_APPEARANCE.backgroundStyle);

        let active = true;
        Promise.all([SystemApi.getInfo(), AppSettingsApi.load(NOTE_SETTING_KEY)])
            .then(([info, note]) => {
                if (!active) {
                    return;
                }
                setAppInfo(info);
                setWorkspaceNote(note ?? '');
                setNoteLoading(false);
            })
            .catch(error => {
                console.error('Failed to load settings context', error);
                if (active) {
                    setNoteLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const saveAppearance = () => {
        localStorage.setItem(STORAGE_KEYS.appName, appName.trim() || DEFAULT_BRANDING.appName);
        localStorage.setItem(STORAGE_KEYS.appShortName, (appShortName.trim() || DEFAULT_BRANDING.appShortName).slice(0, 4));
        localStorage.setItem(STORAGE_KEYS.themeColor, themeColor);
        localStorage.setItem(STORAGE_KEYS.backgroundStyle, backgroundStyle);

        applyTheme();
        dispatchTemplateAppearanceEvents();
        toast('Appearance settings saved locally.', 'success');
    };

    const resetAppearance = () => {
        localStorage.removeItem(STORAGE_KEYS.appName);
        localStorage.removeItem(STORAGE_KEYS.appShortName);
        localStorage.removeItem(STORAGE_KEYS.themeColor);
        localStorage.removeItem(STORAGE_KEYS.backgroundStyle);

        setAppName(DEFAULT_BRANDING.appName);
        setAppShortName(DEFAULT_BRANDING.appShortName);
        setThemeColor(DEFAULT_APPEARANCE.themeColor);
        setBackgroundStyle(DEFAULT_APPEARANCE.backgroundStyle);

        applyTheme();
        dispatchTemplateAppearanceEvents();
        toast('Appearance settings reset.', 'success');
    };

    const saveWorkspaceNote = async () => {
        setNoteSaving(true);
        try {
            const trimmed = workspaceNote.trim();
            if (!trimmed) {
                await AppSettingsApi.clear(NOTE_SETTING_KEY);
            } else {
                await AppSettingsApi.save(NOTE_SETTING_KEY, trimmed);
            }
            toast('Workspace note saved in SQLite.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to save note'), 'error');
        } finally {
            setNoteSaving(false);
        }
    };

    const handleExportSnapshot = async () => {
        try {
            const snapshot = await exportTemplateSnapshot();
            downloadTextFile(
                `template-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(snapshot, null, 2),
                'application/json;charset=utf-8',
            );
            toast('Snapshot exported.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to export snapshot'), 'error');
        }
    };

    const handleImportSnapshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const content = await file.text();
            const snapshot = JSON.parse(content) as TemplateAppSnapshot;
            await importTemplateSnapshot(snapshot);
            applyTheme();
            dispatchTemplateAppearanceEvents();
            setAppName(localStorage.getItem(STORAGE_KEYS.appName) || DEFAULT_BRANDING.appName);
            setAppShortName(localStorage.getItem(STORAGE_KEYS.appShortName) || DEFAULT_BRANDING.appShortName);
            setThemeColor(localStorage.getItem(STORAGE_KEYS.themeColor) || DEFAULT_APPEARANCE.themeColor);
            setBackgroundStyle((localStorage.getItem(STORAGE_KEYS.backgroundStyle) as typeof backgroundStyle) || DEFAULT_APPEARANCE.backgroundStyle);
            setWorkspaceNote(snapshot.workspace_note || '');
            await refreshTemplateRuntime();
            toast('Snapshot imported.', 'success');
        } catch (error) {
            toast(getErrorMessage(error, 'Failed to import snapshot'), 'error');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
                <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Template settings</div>
                <h1 className="text-4xl font-semibold tracking-[-0.03em]">Settings</h1>
                <p className="max-w-[760px] text-[15px] leading-7 text-[var(--text-secondary)]">
                    Non-sensitive preferences stay in local storage. This page also keeps one SQLite-backed setting so the
                    storage split is visible in template core.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                <article className="glass-panel p-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Branding and theme</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            App name
                            <input
                                type="text"
                                value={appName}
                                onChange={event => setAppName(event.target.value)}
                                className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            Short label
                            <input
                                type="text"
                                value={appShortName}
                                onChange={event => setAppShortName(event.target.value)}
                                className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                maxLength={4}
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            Primary color
                            <input
                                type="color"
                                value={themeColor}
                                onChange={event => setThemeColor(event.target.value)}
                                className="h-[52px] rounded-[14px] border border-[var(--border-light)] bg-white/75 px-2 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
                            Background
                            <select
                                value={backgroundStyle}
                                onChange={event => setBackgroundStyle(event.target.value as typeof backgroundStyle)}
                                className="rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            >
                                {backgroundOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" className="btn-primary" onClick={saveAppearance}>
                            Save appearance
                        </button>
                        <button type="button" className="btn-secondary" onClick={resetAppearance}>
                            Reset
                        </button>
                    </div>
                </article>

                <article className="glass-panel p-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Persisted note</div>
                    <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                        Example of a non-secret application setting stored in SQLite through the backend command boundary.
                    </p>
                    <textarea
                        value={workspaceNote}
                        onChange={event => setWorkspaceNote(event.target.value)}
                        className="mt-4 min-h-[190px] w-full rounded-[14px] border border-[var(--border-light)] bg-white/75 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                        placeholder={noteLoading ? 'Loading note...' : 'Document project-specific conventions or onboarding notes.'}
                        disabled={noteLoading || noteSaving}
                    />
                    <div className="mt-4 flex gap-3">
                        <button type="button" className="btn-primary" onClick={saveWorkspaceNote} disabled={noteSaving || noteLoading}>
                            {noteSaving ? 'Saving...' : 'Save note'}
                        </button>
                    </div>
                </article>
            </div>

            <article className="glass-panel p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Environment</div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <div className="text-xs text-[var(--text-tertiary)]">Version</div>
                        <div className="mt-1 text-sm text-[var(--text-primary)]">{appInfo?.version ?? 'Loading...'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-tertiary)]">Mode</div>
                        <div className="mt-1 text-sm text-[var(--text-primary)]">{appInfo ? (appInfo.isPackaged ? 'Packaged build' : 'Development') : 'Loading...'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-tertiary)]">User data path</div>
                        <div className="mt-1 break-all text-sm text-[var(--text-primary)]">{appInfo?.userData ?? 'Loading...'}</div>
                    </div>
                </div>
            </article>

            <article className="glass-panel p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Snapshot</div>
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                    Export or restore the example entity, workspace note, and appearance settings as one JSON snapshot.
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportSnapshot}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="btn-primary" onClick={() => void handleExportSnapshot()}>
                        <Download size={16} />
                        Export snapshot
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} />
                        Import snapshot
                    </button>
                </div>
            </article>
        </section>
    );
}
