export const getErrorMessage = (error: unknown, fallback: string = '未知错误') => {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
};
