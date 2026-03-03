import { invoke } from '@tauri-apps/api/core';
import type {
    Account,
    Category,
    CategoryTrendSnapshot,
    Transaction,
    TransactionFilters,
    TransactionPage,
    FinanceSnapshot,
    Installment,
    InstallmentPeriod,
} from './types';

export * from './types';

// ==============================================
// Accounts API
// ==============================================
export const AccountsApi = {
    getAll(): Promise<Account[]> {
        return invoke<Account[]>('get_accounts');
    },
    getById(id: string): Promise<Account | null> {
        return invoke<Account | null>('get_account', { id });
    },
    create(account: Partial<Account>): Promise<string> {
        const data = {
            id: '', // Will be assigned by backend
            name: account.name || '',
            type: account.type || 'asset',
            currency: account.currency || 'CNY',
            balance: account.balance || 0,
            color: account.color || '#4F46E5',
            credit_limit: account.credit_limit ?? null,
            statement_date: account.statement_date ?? null,
            due_date: account.due_date ?? null,
            apr: account.apr ?? null,
            created_at: '',
            updated_at: '',
        };
        return invoke<string>('create_account', { account: data });
    },
    updateBalance(id: string, newBalance: number): Promise<void> {
        return invoke<void>('update_account', { id, data: { balance: newBalance } });
    },
    update(id: string, data: Partial<Account>): Promise<void> {
        return invoke<void>('update_account', { id, data });
    },
    delete(id: string): Promise<void> {
        return invoke<void>('delete_account', { id });
    },
};

// ==============================================
// Transactions API
// ==============================================
export const TransactionsApi = {
    getAll(limit?: number): Promise<Transaction[]> {
        if (typeof limit === 'number') {
            return invoke<Transaction[]>('get_transactions', { limit });
        }
        return invoke<Transaction[]>('get_transactions');
    },
    getPage(page: number, pageSize: number = 50, filters?: TransactionFilters): Promise<TransactionPage> {
        // 统一在 API 边界做参数归一化：空值转 null，避免后端分支判断复杂化。
        return invoke<TransactionPage>('get_transactions_page', {
            page,
            pageSize,
            query: filters?.query?.trim() ? filters.query.trim() : null,
            accountId: filters?.account_id || null,
            category: filters?.category || null,
            dateFrom: filters?.date_from || null,
            dateTo: filters?.date_to || null,
            minAmount: typeof filters?.min_amount === 'number' ? filters.min_amount : null,
            maxAmount: typeof filters?.max_amount === 'number' ? filters.max_amount : null,
            txType: filters?.tx_type || null,
        });
    },
    create(tx: Partial<Transaction>): Promise<string> {
        const data = {
            id: '',
            account_id: tx.account_id || '',
            amount: tx.amount || 0,
            category: tx.category || '',
            description: tx.description || null,
            date: tx.date || new Date().toISOString(),
            created_at: '',
            updated_at: '',
        };
        return invoke<string>('create_transaction', { tx: data });
    },
    update(id: string, oldTx: Transaction, newData: Partial<Transaction>): Promise<void> {
        return invoke<void>('update_transaction', { id, oldTx, newData });
    },
    delete(tx: Transaction): Promise<void> {
        return invoke<void>('delete_transaction', { tx });
    },
};

// ==============================================
// Finance Aggregate API
// ==============================================
export const FinanceApi = {
    getSnapshot(periodStart?: string, periodEnd?: string, recentLimit: number = 5): Promise<FinanceSnapshot> {
        return invoke<FinanceSnapshot>('get_finance_snapshot', {
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            recentLimit,
        });
    },
    getCategoryTrend(periodStart?: string, periodEnd?: string, limit: number = 6): Promise<CategoryTrendSnapshot> {
        return invoke<CategoryTrendSnapshot>('get_category_trend', {
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            limit,
        });
    },
};

// ==============================================
// Secure Config API
// ==============================================
export const SecureConfigApi = {
    loadApiKey(): Promise<string | null> {
        return invoke<string | null>('load_api_key');
    },
    saveApiKey(apiKey: string): Promise<void> {
        return invoke<void>('save_api_key', { apiKey });
    },
    clearApiKey(): Promise<void> {
        return invoke<void>('clear_api_key');
    },
};

// ==============================================
// Categories API
// ==============================================
export const CategoriesApi = {
    getAll(): Promise<Category[]> {
        return invoke<Category[]>('get_categories');
    },
    create(cat: Partial<Category>): Promise<string> {
        const data = {
            id: '',
            name: cat.name || '',
            type: cat.type || 'expense',
            emoji: cat.emoji || '💰',
            sort_order: cat.sort_order || 0,
            created_at: '',
        };
        return invoke<string>('create_category', { cat: data });
    },
    update(id: string, data: Partial<Category>): Promise<void> {
        return invoke<void>('update_category', { id, data });
    },
    delete(id: string): Promise<void> {
        return invoke<void>('delete_category', { id });
    },
};

// ==============================================
// Installments API
// ==============================================
export const InstallmentsApi = {
    getAll(): Promise<Installment[]> {
        return invoke<Installment[]>('get_installments');
    },
    getByAccount(accountId: string): Promise<Installment[]> {
        return invoke<Installment[]>('get_installments_by_account', { accountId });
    },
    create(inst: Partial<Installment>, periodAmounts?: number[] | null, alreadyPaid?: number): Promise<string> {
        // 前端兜底默认值，保证命令参数结构稳定，减少后端判空分支。
        const data = {
            id: '',
            account_id: inst.account_id || '',
            total_amount: inst.total_amount || 0,
            total_periods: inst.total_periods || 12,
            paid_periods: 0,
            monthly_payment: inst.monthly_payment || 0,
            interest_rate: inst.interest_rate || 0,
            start_date: inst.start_date || new Date().toISOString().split('T')[0],
            description: inst.description || null,
            status: 'active',
            created_at: '',
        };
        return invoke<string>('create_installment', {
            inst: data,
            // 显式传 null，便于 Rust 侧区分“未传”与“空数组”。
            periodAmounts: periodAmounts || null,
            alreadyPaid: alreadyPaid || 0
        });
    },
    getPeriods(installmentId: string): Promise<InstallmentPeriod[]> {
        return invoke<InstallmentPeriod[]>('get_periods', { installmentId });
    },
    payPeriod(id: string): Promise<void> {
        return invoke<void>('pay_period', { id });
    },
    cancel(id: string): Promise<void> {
        return invoke<void>('cancel_installment', { id });
    },
};
