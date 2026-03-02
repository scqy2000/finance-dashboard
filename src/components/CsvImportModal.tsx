import React, { useState, useMemo } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { inputDateTimeToStorage } from '../utils/datetime';

type ImportRow = {
    account_id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
};

type ImportFailure = {
    index: number;
    reason: string;
    row?: ImportRow;
    raw?: string[];
};

type ImportResult = {
    success: number;
    failed: number;
    failedRows?: ImportFailure[];
};

interface CsvImportModalProps {
    isOpen: boolean;
    accounts: { id: string; name: string; type: string }[];
    onClose: () => void;
    onImport: (rows: ImportRow[]) => Promise<ImportResult>;
}

// CSV parser with quote/newline support
function parseCsv(text: string): string[][] {
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

type ColumnMapping = 'date' | 'type' | 'account' | 'amount' | 'category' | 'description' | 'skip';

const COLUMN_OPTIONS: { value: ColumnMapping; label: string }[] = [
    { value: 'skip', label: '跳过' },
    { value: 'date', label: '日期' },
    { value: 'type', label: '类型' },
    { value: 'account', label: '账户' },
    { value: 'amount', label: '金额' },
    { value: 'category', label: '分类' },
    { value: 'description', label: '描述' },
];

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, accounts, onClose, onImport }) => {
    const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'done'>('select');
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [hasHeader, setHasHeader] = useState(true);
    const [columnMap, setColumnMap] = useState<ColumnMapping[]>([]);
    const [accountId, setAccountId] = useState('');
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    // Auto-detect column mapping from header names
    const autoDetectMapping = (headers: string[]): ColumnMapping[] => {
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

    const handleSelectFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'CSV 文件', extensions: ['csv', 'txt'] }],
            });
            if (!selected) return;

            const filePath = typeof selected === 'string' ? selected : selected;
            const content = await readTextFile(filePath as string);
            const parsed = parseCsv(content);

            if (parsed.length < 2) {
                setError('文件内容过少，至少需要 2 行数据（含表头）');
                return;
            }

            setFileName((filePath as string).split(/[/\\]/).pop() || 'file.csv');
            setRawRows(parsed);
            const detected = autoDetectMapping(parsed[0]);
            setColumnMap(detected);
            setAccountId(accounts[0]?.id || '');
            setError('');
            setStep('preview');
        } catch (e: any) {
            setError('读取文件失败: ' + (e.message || e));
        }
    };

    const dataRows = useMemo(() => {
        if (rawRows.length === 0) return [];
        return hasHeader ? rawRows.slice(1) : rawRows;
    }, [rawRows, hasHeader]);

    const headerRow = hasHeader && rawRows.length > 0 ? rawRows[0] : null;
    const previewRows = dataRows.slice(0, 5);
    const colCount = rawRows[0]?.length || 0;

    // Validation
    const mappingValid = useMemo(() => {
        const hasDate = columnMap.includes('date');
        const hasAmount = columnMap.includes('amount');
        return hasDate && hasAmount && accountId;
    }, [columnMap, accountId]);

    const handleStartImport = async () => {
        if (!mappingValid) return;
        setStep('importing');

        const dateIdx = columnMap.indexOf('date');
        const typeIdx = columnMap.indexOf('type');
        const accountIdx = columnMap.indexOf('account');
        const amountIdx = columnMap.indexOf('amount');
        const categoryIdx = columnMap.indexOf('category');
        const descIdx = columnMap.indexOf('description');

        const normalizeAccountName = (value: string) => value.replace(/\s+/g, '').toLowerCase();
        const exactAccountMap = new Map(
            accounts.map(a => [normalizeAccountName(a.name), a.id])
        );

        const parseAmount = (value: string) => {
            const cleaned = (value || '').replace(/[¥￥,\s]/g, '');
            if (!cleaned) return null;
            const parsed = Number(cleaned);
            if (!Number.isFinite(parsed)) return null;
            if (parsed === 0) return null;
            return parsed;
        };

        const parseDate = (value: string) => {
            const raw = (value || '').trim();
            if (!raw) return null;

            const normalized = raw
                .replace(/[年/.]/g, '-')
                .replace(/月/g, '-')
                .replace(/日/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
                const [y, m, d] = normalized.split('-').map(Number);
                if (!y || !m || !d) return null;
                const mm = String(m).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                return `${y}-${mm}-${dd}T00:00:00`;
            }

            if (/^\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}(:\d{1,2})?$/.test(normalized)) {
                const [datePart, timePart] = normalized.split(' ');
                const [y, m, d] = datePart.split('-').map(Number);
                if (!y || !m || !d) return null;

                const [h, min, sec] = timePart.split(':').map(Number);
                if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
                const hh = String(h).padStart(2, '0');
                const mm = String(min).padStart(2, '0');
                const ss = String(Number.isFinite(sec) ? sec : 0).padStart(2, '0');
                const mo = String(m).padStart(2, '0');
                const da = String(d).padStart(2, '0');
                return `${y}-${mo}-${da}T${hh}:${mm}:${ss}`;
            }

            const parsed = new Date(raw);
            if (Number.isNaN(parsed.getTime())) return null;
            return inputDateTimeToStorage(parsed.toISOString());
        };

        const importRows: ImportRow[] = [];
        const sourceRowNumbers: number[] = [];
        const localFailedRows: ImportFailure[] = [];

        dataRows.forEach((row, idx) => {
            const csvRowNumber = hasHeader ? idx + 2 : idx + 1;

            if (row.length <= Math.max(dateIdx, amountIdx)) {
                localFailedRows.push({
                    index: csvRowNumber,
                    reason: '缺少日期或金额列',
                    raw: row,
                });
                return;
            }

            const rawDate = row[dateIdx] || '';
            const amountBase = parseAmount(row[amountIdx] || '');
            if (amountBase == null) {
                localFailedRows.push({
                    index: csvRowNumber,
                    reason: '金额格式无效或为 0',
                    raw: row,
                });
                return;
            }

            let parsedAmount = amountBase;
            const rawType = typeIdx >= 0 ? (row[typeIdx] || '').trim().toLowerCase() : '';

            const isExpenseType = ['支出', 'expense', 'debit', 'out'].some(v => rawType.includes(v));
            const isIncomeType = ['收入', 'income', 'credit', 'in'].some(v => rawType.includes(v));

            if (isExpenseType) {
                parsedAmount = -Math.abs(parsedAmount);
            } else if (isIncomeType) {
                parsedAmount = Math.abs(parsedAmount);
            }

            let resolvedAccountId = accountId;
            if (accountIdx >= 0) {
                const rawAccount = (row[accountIdx] || '').trim();
                if (rawAccount) {
                    const normalizedRaw = normalizeAccountName(rawAccount);
                    const exactMatched = exactAccountMap.get(normalizedRaw);
                    if (exactMatched) {
                        resolvedAccountId = exactMatched;
                    } else {
                        const fuzzyMatched = accounts.find(a => {
                            const normalizedName = normalizeAccountName(a.name);
                            return normalizedName.includes(normalizedRaw) || normalizedRaw.includes(normalizedName);
                        });
                        if (fuzzyMatched) {
                            resolvedAccountId = fuzzyMatched.id;
                        }
                    }
                }
            }

            const isoDate = parseDate(rawDate);
            if (!isoDate) {
                localFailedRows.push({
                    index: csvRowNumber,
                    reason: '日期格式无法识别',
                    raw: row,
                });
                return;
            }

            const finalRow: ImportRow = {
                account_id: resolvedAccountId,
                amount: parsedAmount,
                category: categoryIdx >= 0 ? (row[categoryIdx] || (parsedAmount >= 0 ? '其他收入' : '其他支出')) : (parsedAmount >= 0 ? '其他收入' : '其他支出'),
                description: descIdx >= 0 ? (row[descIdx] || '') : '',
                date: isoDate,
            };

            importRows.push(finalRow);
            sourceRowNumbers.push(csvRowNumber);
        });

        if (importRows.length === 0) {
            setResult({
                success: 0,
                failed: localFailedRows.length,
                failedRows: localFailedRows,
            });
            setStep('done');
            return;
        }

        try {
            const res = await onImport(importRows);
            const remoteFailed = (res.failedRows || []).map(f => ({
                ...f,
                index: sourceRowNumbers[Math.max(0, f.index - 1)] || f.index,
            }));
            setResult({
                success: res.success,
                failed: localFailedRows.length + res.failed,
                failedRows: [...localFailedRows, ...remoteFailed],
            });
            setStep('done');
        } catch (e: any) {
            setError('导入过程中出错: ' + (e.message || e));
            setStep('preview');
        }
    };

    const handleExportFailedRows = async () => {
        if (!result?.failedRows?.length) return;

        const filePath = await save({
            defaultPath: `导入失败明细_${new Date().toISOString().slice(0, 10)}.csv`,
            filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        });
        if (!filePath) return;

        const header = '行号,失败原因,账户ID,金额,分类,描述,日期,原始列';
        const rows = result.failedRows.map(item => {
            const row = item.row;
            const rawCols = (item.raw || []).join(' | ').replace(/,/g, '，');
            return [
                item.index,
                (item.reason || '').replace(/,/g, '，'),
                (row?.account_id || '').replace(/,/g, '，'),
                typeof row?.amount === 'number' ? row.amount.toFixed(2) : '',
                (row?.category || '').replace(/,/g, '，'),
                (row?.description || '').replace(/,/g, '，'),
                row?.date || '',
                rawCols,
            ].join(',');
        });

        await writeTextFile(filePath, '\uFEFF' + [header, ...rows].join('\n'));
    };

    const handleClose = () => {
        setStep('select');
        setRawRows([]);
        setColumnMap([]);
        setAccountId('');
        setResult(null);
        setError('');
        setFileName('');
        onClose();
    };

    if (!isOpen) return null;

    const inputCls = "w-full py-2 px-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] text-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 bg-white/70 focus:border-[var(--color-primary)] focus:bg-white focus:shadow-[0_0_0_3px_var(--color-primary-light),var(--shadow-sm)]";

    return (
        <div className="motion-overlay-fade fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="glass-panel motion-panel-slide w-[680px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-light)]">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Upload size={18} /> 导入 CSV 流水
                    </h2>
                    <button className="border-none bg-none cursor-pointer p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Step 1: Select File */}
                    {step === 'select' && (
                        <div className="flex flex-col items-center gap-6 py-10">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
                                <FileText size={32} className="text-[var(--color-primary)]" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-[var(--text-primary)] font-medium mb-1">选择 CSV 文件</p>
                                <p className="text-xs text-[var(--text-tertiary)]">支持 CSV、TXT 格式，需包含日期和金额列</p>
                            </div>
                            <button
                                className="btn-primary flex items-center gap-2 py-2.5 px-6 border-none rounded-[var(--radius-md)] text-sm font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_14px_rgba(79,70,229,0.4)] hover:-translate-y-px"
                                onClick={handleSelectFile}
                            >
                                <Upload size={16} /> 选择文件
                            </button>
                        </div>
                    )}

                    {/* Step 2: Preview & Mapping */}
                    {step === 'preview' && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                    <FileText size={14} className="inline mr-1" />
                                    {fileName} — 共 {dataRows.length} 行数据
                                </p>
                                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                                    <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />
                                    首行为表头
                                </label>
                            </div>

                            {/* Column Mapping */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">列映射（至少需要「日期」和「金额」）</label>
                                <div className="flex gap-2 flex-wrap">
                                    {Array.from({ length: colCount }).map((_, i) => (
                                        <div key={i} className="flex flex-col gap-1 min-w-[100px] flex-1">
                                            <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                                                {headerRow ? headerRow[i] : `列 ${i + 1}`}
                                            </span>
                                            <select
                                                className="py-1.5 px-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-xs outline-none bg-white/70 focus:border-[var(--color-primary)]"
                                                value={columnMap[i] || 'skip'}
                                                onChange={e => {
                                                    const newMap = [...columnMap];
                                                    newMap[i] = e.target.value as ColumnMapping;
                                                    setColumnMap(newMap);
                                                }}
                                            >
                                                {COLUMN_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Account Selection */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">默认导入账户（账户列未匹配时回退）</label>
                                <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
                                    <option value="" disabled>选择目标账户</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            {/* Preview Table */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-medium text-[var(--text-secondary)]">数据预览（前 5 行）</label>
                                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-light)]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg-surface-hover)]">
                                                {Array.from({ length: colCount }).map((_, i) => (
                                                    <th key={i} className="py-2 px-3 text-left font-medium text-[var(--text-secondary)] border-b border-[var(--border-light)] whitespace-nowrap">
                                                        {headerRow ? headerRow[i] : `列 ${i + 1}`}
                                                        {columnMap[i] && columnMap[i] !== 'skip' && (
                                                            <span className="ml-1 text-[10px] py-0.5 px-1 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                                                                {COLUMN_OPTIONS.find(o => o.value === columnMap[i])?.label}
                                                            </span>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, ri) => (
                                                <tr key={ri} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                                                    {Array.from({ length: colCount }).map((_, ci) => (
                                                        <td key={ci} className="py-2 px-3 text-[var(--text-primary)] border-b border-[var(--border-light)] whitespace-nowrap max-w-[200px] truncate">
                                                            {row[ci] || ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {!mappingValid && (
                                <p className="text-xs text-[var(--color-warning)] flex items-center gap-1">
                                    <AlertCircle size={12} /> 请确保已映射「日期」和「金额」列，且已选择目标账户
                                </p>
                            )}
                        </>
                    )}

                    {/* Step 3: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center gap-4 py-10">
                            <Loader2 size={40} className="text-[var(--color-primary)] animate-spin" />
                            <p className="text-sm text-[var(--text-secondary)]">正在导入 {dataRows.length} 条记录...</p>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === 'done' && result && (
                        <div className="flex flex-col items-center gap-4 py-10">
                            <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-[var(--color-success)]" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-[var(--text-primary)]">导入完成</p>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    成功 <strong className="text-[var(--color-success)]">{result.success}</strong> 条
                                    {result.failed > 0 && (
                                        <>, 失败 <strong className="text-[var(--color-danger)]">{result.failed}</strong> 条</>
                                    )}
                                </p>
                                {result.failed > 0 && (
                                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                        可导出失败明细，排查格式或字段映射问题后再次导入。
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-5 border-t border-[var(--border-light)]">
                    {step === 'preview' && (
                        <button
                            className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-surface-hover)]"
                            onClick={() => { setStep('select'); setRawRows([]); setError(''); }}
                        >
                            重新选择文件
                        </button>
                    )}
                    <div className="flex-1" />
                    {step === 'select' && (
                        <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={handleClose}>
                            取消
                        </button>
                    )}
                    {step === 'preview' && (
                        <div className="flex gap-3">
                            <button className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer" onClick={handleClose}>
                                取消
                            </button>
                            <button
                                className="btn-primary py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!mappingValid}
                                onClick={handleStartImport}
                            >
                                确认导入 ({dataRows.length} 条)
                            </button>
                        </div>
                    )}
                    {step === 'done' && (
                        <div className="flex gap-3">
                            {result?.failedRows && result.failedRows.length > 0 && (
                                <button
                                    className="py-2 px-4 border border-[var(--border-light)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer"
                                    onClick={handleExportFailedRows}
                                >
                                    导出失败明细
                                </button>
                            )}
                            <button
                                className="btn-primary py-2 px-5 border-none rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-primary)] text-white cursor-pointer shadow-[0_4px_10px_rgba(79,70,229,0.3)]"
                                onClick={handleClose}
                            >
                                完成
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
