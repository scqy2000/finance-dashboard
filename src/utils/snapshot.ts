import { AppSettingsApi, ItemsApi } from '../api/client';
import type { TemplateAppSnapshot } from '../api/types';
import { DEFAULT_APPEARANCE, DEFAULT_BRANDING, STORAGE_KEYS } from './preferences';

const WORKSPACE_NOTE_KEY = 'template_workspace_note';

export async function exportTemplateSnapshot() {
    const [items, workspaceNote] = await Promise.all([
        ItemsApi.getAll(5000),
        AppSettingsApi.load(WORKSPACE_NOTE_KEY),
    ]);

    const snapshot: TemplateAppSnapshot = {
        exported_at: new Date().toISOString(),
        items: items.map(item => ({
            title: item.title,
            summary: item.summary,
            status: item.status,
        })),
        workspace_note: workspaceNote ?? '',
        appearance: {
            appName: localStorage.getItem(STORAGE_KEYS.appName) || DEFAULT_BRANDING.appName,
            appShortName: localStorage.getItem(STORAGE_KEYS.appShortName) || DEFAULT_BRANDING.appShortName,
            themeColor: localStorage.getItem(STORAGE_KEYS.themeColor) || DEFAULT_APPEARANCE.themeColor,
            backgroundStyle: localStorage.getItem(STORAGE_KEYS.backgroundStyle) || DEFAULT_APPEARANCE.backgroundStyle,
        },
    };

    return snapshot;
}

export async function importTemplateSnapshot(snapshot: TemplateAppSnapshot) {
    const existingItems = await ItemsApi.getAll(5000);
    await Promise.all(existingItems.map(item => ItemsApi.delete(item.id)));
    await Promise.all(snapshot.items.map(item => ItemsApi.create(item)));

    if (snapshot.workspace_note.trim()) {
        await AppSettingsApi.save(WORKSPACE_NOTE_KEY, snapshot.workspace_note.trim());
    } else {
        await AppSettingsApi.clear(WORKSPACE_NOTE_KEY);
    }

    localStorage.setItem(STORAGE_KEYS.appName, snapshot.appearance.appName || DEFAULT_BRANDING.appName);
    localStorage.setItem(STORAGE_KEYS.appShortName, snapshot.appearance.appShortName || DEFAULT_BRANDING.appShortName);
    localStorage.setItem(STORAGE_KEYS.themeColor, snapshot.appearance.themeColor || DEFAULT_APPEARANCE.themeColor);
    localStorage.setItem(STORAGE_KEYS.backgroundStyle, snapshot.appearance.backgroundStyle || DEFAULT_APPEARANCE.backgroundStyle);
}
