export type ColumnMapping = 'date' | 'type' | 'account' | 'amount' | 'category' | 'description' | 'skip';

export const COLUMN_OPTIONS: { value: ColumnMapping; label: string }[] = [
    { value: 'skip', label: '跳过' },
    { value: 'date', label: '日期' },
    { value: 'type', label: '类型' },
    { value: 'account', label: '账户' },
    { value: 'amount', label: '金额' },
    { value: 'category', label: '分类' },
    { value: 'description', label: '描述' },
];

export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let fields: string[] = [];
    let current = '';
    let inQuotes = false;

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < normalized.length; i += 1) {
        const ch = normalized[i];

        if (inQuotes) {
            if (ch === '"' && normalized[i + 1] === '"') {
                current += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            fields.push(current.trim());
            current = '';
        } else if (ch === '\n') {
            fields.push(current.trim());
            if (fields.some(v => v !== '')) {
                rows.push(fields);
            }
            fields = [];
            current = '';
        } else {
            current += ch;
        }
    }

    fields.push(current.trim());
    if (fields.some(v => v !== '')) {
        rows.push(fields);
    }

    return rows;
}

export const autoDetectMapping = (headers: string[]): ColumnMapping[] => {
    return headers.map(h => {
        const lower = h.toLowerCase();
        if (lower.includes('日期') || lower.includes('date') || lower.includes('time') || lower.includes('时间')) return 'date';
        if (lower.includes('类型') || lower.includes('type') || lower.includes('收支')) return 'type';
        if (lower.includes('账户') || lower.includes('account') || lower.includes('wallet') || lower.includes('card')) return 'account';
        if (lower.includes('金额') || lower.includes('amount') || lower.includes('money') || lower.includes('数额')) return 'amount';
        if (lower.includes('分类') || lower.includes('类别') || lower.includes('category')) return 'category';
        if (lower.includes('描述') || lower.includes('备注') || lower.includes('说明') || lower.includes('desc') || lower.includes('note') || lower.includes('摘要')) return 'description';
        return 'skip';
    });
};
