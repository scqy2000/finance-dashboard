export const formatMoneyCny = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return prefix + new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
};

export const formatTimeZh = (isoDate: string) => {
    try {
        const d = new Date(isoDate);
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};
