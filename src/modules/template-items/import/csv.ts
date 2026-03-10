export type TemplateItemColumnMapping = 'title' | 'summary' | 'status' | 'skip';

export const TEMPLATE_ITEM_COLUMN_OPTIONS: Array<{ value: TemplateItemColumnMapping; label: string }> = [
    { value: 'skip', label: 'Skip' },
    { value: 'title', label: 'Title' },
    { value: 'summary', label: 'Summary' },
    { value: 'status', label: 'Status' },
];

export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let fields: string[] = [];
    let current = '';
    let inQuotes = false;

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let index = 0; index < normalized.length; index += 1) {
        const character = normalized[index];

        if (inQuotes) {
            if (character === '"' && normalized[index + 1] === '"') {
                current += '"';
                index += 1;
            } else if (character === '"') {
                inQuotes = false;
            } else {
                current += character;
            }
            continue;
        }

        if (character === '"') {
            inQuotes = true;
        } else if (character === ',') {
            fields.push(current.trim());
            current = '';
        } else if (character === '\n') {
            fields.push(current.trim());
            if (fields.some(value => value !== '')) {
                rows.push(fields);
            }
            fields = [];
            current = '';
        } else {
            current += character;
        }
    }

    fields.push(current.trim());
    if (fields.some(value => value !== '')) {
        rows.push(fields);
    }

    return rows;
}

export function autoDetectTemplateItemMapping(headers: string[]): TemplateItemColumnMapping[] {
    return headers.map(header => {
        const normalized = header.toLowerCase();
        if (normalized.includes('title') || normalized.includes('name') || normalized.includes('标题') || normalized.includes('名称')) {
            return 'title';
        }
        if (normalized.includes('summary') || normalized.includes('description') || normalized.includes('desc') || normalized.includes('备注') || normalized.includes('说明')) {
            return 'summary';
        }
        if (normalized.includes('status') || normalized.includes('状态')) {
            return 'status';
        }
        return 'skip';
    });
}

export function normalizeTemplateItemStatus(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return 'draft' as const;
    }
    if (['draft', '草稿'].includes(normalized)) {
        return 'draft' as const;
    }
    if (['active', '进行中', '启用'].includes(normalized)) {
        return 'active' as const;
    }
    if (['archived', 'archive', '归档'].includes(normalized)) {
        return 'archived' as const;
    }
    return null;
}
