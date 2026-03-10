import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Upload, X } from 'lucide-react';
import type { CreateTemplateItemInput, ImportFailure, ImportResult } from '../../../api/types';
import { getErrorMessage } from '../../../utils/errors';
import {
    autoDetectTemplateItemMapping,
    normalizeTemplateItemStatus,
    parseCsv,
    TEMPLATE_ITEM_COLUMN_OPTIONS,
    type TemplateItemColumnMapping,
} from '../import/csv';

type TemplateItemsImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImport: (rows: CreateTemplateItemInput[]) => Promise<ImportResult<CreateTemplateItemInput>>;
};

type LocalFailure = ImportFailure<CreateTemplateItemInput>;

export function TemplateItemsImportModal({ isOpen, onClose, onImport }: TemplateItemsImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'done'>('select');
    const [fileName, setFileName] = useState('');
    const [hasHeader, setHasHeader] = useState(true);
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [columnMap, setColumnMap] = useState<TemplateItemColumnMapping[]>([]);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ImportResult<CreateTemplateItemInput> | null>(null);

    const headerRow = hasHeader && rawRows.length > 0 ? rawRows[0] : null;
    const dataRows = useMemo(() => {
        if (rawRows.length === 0) {
            return [];
        }
        return hasHeader ? rawRows.slice(1) : rawRows;
    }, [hasHeader, rawRows]);
    const previewRows = dataRows.slice(0, 5);
    const columnCount = rawRows[0]?.length ?? 0;
    const mappingValid = columnMap.includes('title');

    if (!isOpen) {
        return null;
    }

    const resetState = () => {
        setStep('select');
        setFileName('');
        setHasHeader(true);
        setRawRows([]);
        setColumnMap([]);
        setError('');
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const content = await file.text();
            const parsedRows = parseCsv(content);
            if (parsedRows.length === 0) {
                setError('The selected file has no usable rows.');
                return;
            }

            setFileName(file.name);
            setRawRows(parsedRows);
            setColumnMap(autoDetectTemplateItemMapping(parsedRows[0]));
            setError('');
            setStep('preview');
        } catch (importError) {
            setError(getErrorMessage(importError, 'Failed to read file'));
        }
    };

    const handleStartImport = async () => {
        if (!mappingValid) {
            return;
        }

        setStep('importing');

        const titleIndex = columnMap.indexOf('title');
        const summaryIndex = columnMap.indexOf('summary');
        const statusIndex = columnMap.indexOf('status');

        const importRows: CreateTemplateItemInput[] = [];
        const sourceRowNumbers: number[] = [];
        const localFailures: LocalFailure[] = [];

        dataRows.forEach((row, index) => {
            const csvRowNumber = hasHeader ? index + 2 : index + 1;
            const title = (row[titleIndex] || '').trim();
            if (!title) {
                localFailures.push({
                    index: csvRowNumber,
                    reason: 'Title is required',
                    raw: row,
                });
                return;
            }

            const statusValue = statusIndex >= 0 ? normalizeTemplateItemStatus(row[statusIndex] || '') : 'draft';
            if (!statusValue) {
                localFailures.push({
                    index: csvRowNumber,
                    reason: 'Status is invalid',
                    raw: row,
                });
                return;
            }

            importRows.push({
                title,
                summary: summaryIndex >= 0 ? (row[summaryIndex] || '').trim() : '',
                status: statusValue,
            });
            sourceRowNumbers.push(csvRowNumber);
        });

        if (importRows.length === 0) {
            setResult({
                success: 0,
                failed: localFailures.length,
                failedRows: localFailures,
            });
            setStep('done');
            return;
        }

        try {
            const importResult = await onImport(importRows);
            const remoteFailures = (importResult.failedRows || []).map(failure => ({
                ...failure,
                index: sourceRowNumbers[Math.max(0, failure.index - 1)] || failure.index,
            }));

            setResult({
                success: importResult.success,
                failed: localFailures.length + importResult.failed,
                failedRows: [...localFailures, ...remoteFailures],
            });
            setStep('done');
        } catch (importError) {
            setError(getErrorMessage(importError, 'Import failed'));
            setStep('preview');
        }
    };

    const handleExportFailures = () => {
        if (!result?.failedRows?.length) {
            return;
        }

        const header = 'row,reason,title,summary,status,raw';
        const rows = result.failedRows.map(item => {
            const rawColumns = (item.raw || []).join(' | ').replace(/,/g, '，');
            return [
                item.index,
                (item.reason || '').replace(/,/g, '，'),
                (item.row?.title || '').replace(/,/g, '，'),
                (item.row?.summary || '').replace(/,/g, '，'),
                item.row?.status || '',
                rawColumns,
            ].join(',');
        });

        const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `template-item-import-failures-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const inputClassName = 'w-full py-2 px-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none bg-white/70 focus:border-[var(--color-primary)]';

    return (
        <div className="motion-overlay-fade fixed inset-0 z-[2200] bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-4">
            <div className="glass-panel motion-panel-slide w-full max-w-[760px] max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Upload size={18} />
                        Import template items from CSV
                    </h2>
                    <button type="button" className="btn-secondary" onClick={handleClose}>
                        <X size={16} />
                        Close
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                    {error && (
                        <div className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)] flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {step === 'select' && (
                        <div className="flex flex-col items-center gap-6 py-10">
                            <div className="h-16 w-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
                                <FileText size={30} className="text-[var(--color-primary)]" />
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-[var(--text-primary)]">Select a CSV file</div>
                                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                    Keep one title column. Summary and status are optional.
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                data-testid="template-items-import-file-input"
                                accept=".csv,text/csv,.txt"
                                className="hidden"
                                onChange={handleSelectFile}
                            />
                            <button type="button" className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={16} />
                                Choose file
                            </button>
                        </div>
                    )}

                    {step === 'preview' && (
                        <>
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                    {fileName} - {dataRows.length} rows
                                </div>
                                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <input type="checkbox" checked={hasHeader} onChange={event => setHasHeader(event.target.checked)} />
                                    First row is header
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                {Array.from({ length: columnCount }).map((_, index) => (
                                    <div key={`column-${index}`} className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-white/55 p-3">
                                        <div className="text-xs text-[var(--text-tertiary)]">
                                            Column {index + 1}
                                            {headerRow ? ` - ${headerRow[index] || '(empty)'}` : ''}
                                        </div>
                                        <select
                                            value={columnMap[index] || 'skip'}
                                            onChange={event => {
                                                const nextMap = [...columnMap];
                                                nextMap[index] = event.target.value as TemplateItemColumnMapping;
                                                setColumnMap(nextMap);
                                            }}
                                            className={`${inputClassName} mt-2`}
                                        >
                                            {TEMPLATE_ITEM_COLUMN_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-white/55 overflow-hidden">
                                <div className="border-b border-[var(--border-light)] px-4 py-3 text-sm font-medium">
                                    Preview
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-white/65 text-left text-[var(--text-secondary)]">
                                                {Array.from({ length: columnCount }).map((_, index) => (
                                                    <th key={`head-${index}`} className="px-4 py-3 font-medium">
                                                        {headerRow?.[index] || `Column ${index + 1}`}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, rowIndex) => (
                                                <tr key={`preview-row-${rowIndex}`} className="border-t border-[var(--border-light)]">
                                                    {Array.from({ length: columnCount }).map((_, columnIndex) => (
                                                        <td key={`preview-cell-${rowIndex}-${columnIndex}`} className="px-4 py-3 text-[var(--text-primary)]">
                                                            {row[columnIndex] || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {!mappingValid && (
                                <div className="text-sm text-[var(--color-danger)]">
                                    Map at least one column to Title before importing.
                                </div>
                            )}
                        </>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center gap-4 py-10 text-sm text-[var(--text-secondary)]">
                            <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
                            Importing rows...
                        </div>
                    )}

                    {step === 'done' && result && (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-light)] px-4 py-4 flex items-center gap-3">
                                <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
                                <div className="text-sm text-[var(--text-primary)]">
                                    Imported {result.success} rows, failed {result.failed} rows. Use the undo banner on the page to roll back the last successful import if needed.
                                </div>
                            </div>

                            {!!result.failedRows?.length && (
                                <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-white/55 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="text-sm font-medium">Failed rows</div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                Export them if you want to correct and re-import later.
                                            </div>
                                        </div>
                                        <button type="button" className="btn-secondary" onClick={handleExportFailures}>
                                            <Download size={16} />
                                            Export failures
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-2 text-sm">
                                        {result.failedRows.slice(0, 10).map(item => (
                                            <div key={`failure-${item.index}-${item.reason}`} className="rounded-[var(--radius-sm)] bg-white/70 px-3 py-2">
                                                Row {item.index}: {item.reason}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--border-light)] px-5 py-4 flex justify-end gap-3">
                    {step === 'preview' && (
                        <button type="button" data-testid="template-items-import-submit" className="btn-primary" onClick={() => void handleStartImport()} disabled={!mappingValid}>
                            Import rows
                        </button>
                    )}
                    {step === 'done' && (
                        <button type="button" className="btn-primary" onClick={handleClose}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

