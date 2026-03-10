import type { TemplateItem } from '../../../api/types';
import { downloadTextFile } from '../../../utils/download';

export function downloadTemplateItemsCsv(items: TemplateItem[]) {
    const header = 'title,summary,status,created_at,updated_at';
    const rows = items.map(item =>
        [
            escapeCsvValue(item.title),
            escapeCsvValue(item.summary),
            escapeCsvValue(item.status),
            escapeCsvValue(item.created_at),
            escapeCsvValue(item.updated_at),
        ].join(','),
    );

    downloadTextFile(
        `template-items-${new Date().toISOString().slice(0, 10)}.csv`,
        '\uFEFF' + [header, ...rows].join('\n'),
        'text/csv;charset=utf-8',
    );
}

export function downloadTemplateItemsCsvSample() {
    const header = 'title,summary,status';
    const rows = [
        'Ship reusable sidebar shell,Reusable layout extracted from source app,active',
        'Draft a migration note,Explain which reference modules are worth copying,draft',
    ];

    downloadTextFile(
        'template-items-sample.csv',
        '\uFEFF' + [header, ...rows].join('\n'),
        'text/csv;charset=utf-8',
    );
}

function escapeCsvValue(value: string) {
    const normalized = value.replace(/"/g, '""');
    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}
