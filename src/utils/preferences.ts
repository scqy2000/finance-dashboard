export type NavigationTab = 'overview' | 'items' | 'references' | 'settings';

export type BackgroundStyle = 'paper' | 'sunrise' | 'atlas' | 'mesh';

export const STORAGE_KEYS = {
    appName: 'template_app_name',
    appShortName: 'template_app_short_name',
    themeColor: 'template_theme_color',
    backgroundStyle: 'template_bg_style',
} as const;

export const THEME_EVENTS = {
    appearanceChanged: 'template:appearance-changed',
    brandingChanged: 'template:branding-changed',
} as const;

export const DEFAULT_BRANDING = {
    appName: 'Local First Template',
    appShortName: 'LF',
};

export const DEFAULT_APPEARANCE = {
    themeColor: '#0f766e',
    backgroundStyle: 'paper' as BackgroundStyle,
};

const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return `rgba(15, 118, 110, ${alpha})`;
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const darkenHex = (hex: string, ratio: number) => {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return '#115e59';
    }

    const darken = (segment: string) => {
        const value = Number.parseInt(segment, 16);
        const next = Math.max(0, Math.min(255, Math.round(value * (1 - ratio))));
        return next.toString(16).padStart(2, '0');
    };

    return `#${darken(normalized.slice(0, 2))}${darken(normalized.slice(2, 4))}${darken(normalized.slice(4, 6))}`;
};

const backgroundMap: Record<BackgroundStyle, string> = {
    paper: 'linear-gradient(180deg, #f7f6f1 0%, #edf2f7 100%)',
    sunrise: 'linear-gradient(135deg, #f8efe4 0%, #f6d2b6 45%, #eab38f 100%)',
    atlas: 'radial-gradient(circle at top left, rgba(15, 118, 110, 0.14), transparent 40%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 35%), linear-gradient(160deg, #edf7f7 0%, #eef2ff 100%)',
    mesh: 'radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.14), transparent 25%), radial-gradient(circle at 90% 15%, rgba(15, 118, 110, 0.18), transparent 30%), radial-gradient(circle at 50% 80%, rgba(244, 114, 182, 0.10), transparent 28%), linear-gradient(160deg, #fbfbfd 0%, #edf4f5 100%)',
};

export const getBranding = () => ({
    appName: localStorage.getItem(STORAGE_KEYS.appName)?.trim() || DEFAULT_BRANDING.appName,
    appShortName: localStorage.getItem(STORAGE_KEYS.appShortName)?.trim() || DEFAULT_BRANDING.appShortName,
});

export const getAppearance = () => {
    const themeColor = localStorage.getItem(STORAGE_KEYS.themeColor)?.trim() || DEFAULT_APPEARANCE.themeColor;
    const backgroundStyle = (localStorage.getItem(STORAGE_KEYS.backgroundStyle)?.trim() as BackgroundStyle) || DEFAULT_APPEARANCE.backgroundStyle;

    return {
        themeColor,
        backgroundStyle: backgroundMap[backgroundStyle] ? backgroundStyle : DEFAULT_APPEARANCE.backgroundStyle,
    };
};

export const dispatchTemplateAppearanceEvents = () => {
    window.dispatchEvent(new CustomEvent(THEME_EVENTS.appearanceChanged));
    window.dispatchEvent(new CustomEvent(THEME_EVENTS.brandingChanged));
};

export const applyTheme = () => {
    const root = document.documentElement;
    const { themeColor, backgroundStyle } = getAppearance();

    root.style.setProperty('--color-primary', themeColor);
    root.style.setProperty('--color-primary-dark', darkenHex(themeColor, 0.18));
    root.style.setProperty('--color-primary-hover', darkenHex(themeColor, 0.08));
    root.style.setProperty('--color-primary-light', hexToRgba(themeColor, 0.14));
    root.style.setProperty('--color-primary-glow', hexToRgba(themeColor, 0.32));
    root.style.setProperty('--bg-app', backgroundMap[backgroundStyle]);
    root.style.setProperty('--titlebar-bg', 'rgba(247, 248, 250, 0.82)');
};
