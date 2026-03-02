const pad = (n: number) => String(n).padStart(2, '0');

const formatLocal = (date: Date) => {
    // 统一使用本地时间格式化，避免 toISOString() 引入时区偏移。
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());
    return {
        date: `${year}-${month}-${day}`,
        datetimeMinute: `${year}-${month}-${day}T${hour}:${minute}`,
        datetimeSecond: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    };
};

export const dateToLocalIso = (date: Date) => {
    return formatLocal(date).datetimeSecond;
};

export const nowLocalDateTimeInputValue = () => {
    return formatLocal(new Date()).datetimeMinute;
};

export const nowLocalIso = () => {
    return formatLocal(new Date()).datetimeSecond;
};

export const startOfCurrentMonthLocalIso = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return formatLocal(start).datetimeSecond;
};

export const localDateOnlyToStartIso = (dateOnly: string) => {
    const cleaned = dateOnly.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return null;
    }
    return `${cleaned}T00:00:00`;
};

export const localDateOnlyToExclusiveEndIso = (dateOnly: string) => {
    const cleaned = dateOnly.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return null;
    }
    const date = new Date(`${cleaned}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    // 结束边界采用“次日 00:00:00（不含）”语义，便于后端写 [from, to) 查询。
    date.setDate(date.getDate() + 1);
    return formatLocal(date).datetimeSecond;
};

export const storageDateToInputDateTime = (value: string) => {
    const normalized = (value || '').trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
        return normalized.slice(0, 16);
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return formatLocal(parsed).datetimeMinute;
    }

    return nowLocalDateTimeInputValue();
};

export const inputDateTimeToStorage = (value: string) => {
    const normalized = (value || '').trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return `${normalized}T00:00:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
        return `${normalized}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
        return normalized;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return formatLocal(parsed).datetimeSecond;
    }

    return nowLocalIso();
};

export const dateOnlyForFileName = () => {
    return formatLocal(new Date()).date;
};
