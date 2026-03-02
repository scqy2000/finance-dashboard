export interface Account {
    id: string;
    name: string;
    type: 'asset' | 'liability';
    currency: string;
    balance: number;
    color: string;
    credit_limit: number | null;
    statement_date: number | null;
    due_date: number | null;
    apr: number | null;
    created_at: string;
    updated_at: string;
}

export type NewAccount = Omit<Account, 'id' | 'created_at' | 'updated_at'>;

export interface Transaction {
    id: string;
    account_id: string;
    amount: number;
    category: string;
    description: string | null;
    date: string;
    created_at: string;
    updated_at: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

export interface TransactionPage {
    items: Transaction[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
}

export interface TransactionFilters {
    query?: string;
    account_id?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
    tx_type?: 'expense' | 'income';
}

export interface FinanceSnapshot {
    total_assets: number;
    total_debt: number;
    net_worth: number;
    period_income: number;
    period_expense: number;
    monthly_installment: number;
    transaction_count: number;
    account_count: number;
    active_installments: number;
    recent_transactions: Transaction[];
}

export interface Category {
    id: string;
    name: string;
    type: 'expense' | 'income';
    emoji: string;
    sort_order: number;
    created_at: string;
}

export type NewCategory = Omit<Category, 'id' | 'created_at'>;

export interface Installment {
    id: string;
    account_id: string;
    total_amount: number;
    total_periods: number;
    paid_periods: number;
    monthly_payment: number;
    interest_rate: number;
    start_date: string;
    description: string | null;
    status: 'active' | 'completed' | 'cancelled';
    created_at: string;
}

export type NewInstallment = Omit<Installment, 'id' | 'paid_periods' | 'status' | 'created_at'>;

export interface InstallmentPeriod {
    id: string;
    installment_id: string;
    period_number: number;
    amount: number;
    status: 'pending' | 'paid' | 'skipped';
    note: string;
    paid_at: string | null;
}

export type NewInstallmentPeriod = Omit<InstallmentPeriod, 'id' | 'status' | 'paid_at'>;
