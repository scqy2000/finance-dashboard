import { create } from 'zustand';
import {
    AccountsApi, TransactionsApi, CategoriesApi, InstallmentsApi,
} from '../api/db';
import type { Account, Transaction, Category, Installment, InstallmentPeriod } from '../api/db';

// ==========================================
// Store State
// ==========================================
interface AppState {
    // --- Accounts ---
    accounts: Account[];
    accountsLoading: boolean;
    accountsError: string | null;
    loadAccounts: () => Promise<void>;
    addAccount: (account: Partial<Account>) => Promise<boolean>;
    updateAccount: (id: string, data: Partial<Account>) => Promise<boolean>;
    deleteAccount: (id: string) => Promise<boolean>;

    // --- Transactions ---
    transactions: Transaction[];
    transactionsLoading: boolean;
    transactionsError: string | null;
    loadTransactions: (limit?: number) => Promise<void>;
    addTransaction: (tx: Partial<Transaction>) => Promise<boolean>;
    updateTransaction: (id: string, oldTx: Transaction, newData: Partial<Transaction>) => Promise<boolean>;
    deleteTransaction: (tx: Transaction) => Promise<boolean>;

    // --- Categories ---
    categories: Category[];
    categoriesLoading: boolean;
    loadCategories: () => Promise<void>;
    addCategory: (cat: Partial<Category>) => Promise<void>;
    updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // --- Installments ---
    installments: Installment[];
    installmentsLoading: boolean;
    loadInstallments: () => Promise<void>;
    addInstallment: (inst: Partial<Installment>, periodAmounts?: number[], alreadyPaid?: number) => Promise<void>;
    payPeriod: (id: string) => Promise<void>;
    cancelInstallment: (id: string) => Promise<void>;
    getPeriods: (installmentId: string) => Promise<InstallmentPeriod[]>;

    // --- Global ---
    initialized: boolean;
    init: () => Promise<void>;
    refreshAll: () => Promise<void>;
}

// ==========================================
// Store Implementation
// ==========================================
export const useStore = create<AppState>((set, get) => ({
    // ----- Accounts -----
    accounts: [],
    accountsLoading: true,
    accountsError: null,

    loadAccounts: async () => {
        set({ accountsLoading: true, accountsError: null });
        try {
            const accounts = await AccountsApi.getAll();
            set({ accounts, accountsLoading: false });
        } catch (err: any) {
            set({ accountsError: err.message, accountsLoading: false });
        }
    },

    addAccount: async (account) => {
        try {
            await AccountsApi.create(account);
            await get().loadAccounts();
            return true;
        } catch (err: any) {
            set({ accountsError: err.message });
            return false;
        }
    },

    updateAccount: async (id, data) => {
        try {
            await AccountsApi.update(id, data);
            await get().loadAccounts();
            return true;
        } catch (err: any) {
            set({ accountsError: err.message });
            return false;
        }
    },

    deleteAccount: async (id) => {
        try {
            await AccountsApi.delete(id);
            await get().loadAccounts();
            return true;
        } catch (err: any) {
            set({ accountsError: err.message });
            return false;
        }
    },

    // ----- Transactions -----
    transactions: [],
    transactionsLoading: true,
    transactionsError: null,

    loadTransactions: async (limit) => {
        set({ transactionsLoading: true, transactionsError: null });
        try {
            const transactions = await TransactionsApi.getAll(limit);
            set({ transactions, transactionsLoading: false });
        } catch (err: any) {
            set({ transactionsError: err.message, transactionsLoading: false });
        }
    },

    addTransaction: async (tx) => {
        try {
            await TransactionsApi.create(tx);
            await get().loadTransactions();
            await get().loadAccounts(); // Balance changed
            return true;
        } catch (err: any) {
            set({ transactionsError: err.message });
            return false;
        }
    },

    updateTransaction: async (id, oldTx, newData) => {
        try {
            await TransactionsApi.update(id, oldTx, newData);
            await get().loadTransactions();
            await get().loadAccounts(); // Balance may have changed
            return true;
        } catch (err: any) {
            set({ transactionsError: err.message });
            return false;
        }
    },

    deleteTransaction: async (tx) => {
        try {
            await TransactionsApi.delete(tx);
            await get().loadTransactions();
            await get().loadAccounts(); // Balance changed
            return true;
        } catch (err: any) {
            set({ transactionsError: err.message });
            return false;
        }
    },

    // ----- Categories -----
    categories: [],
    categoriesLoading: true,

    loadCategories: async () => {
        set({ categoriesLoading: true });
        try {
            const categories = await CategoriesApi.getAll();
            set({ categories, categoriesLoading: false });
        } catch (e) {
            console.error('Failed to load categories', e);
            set({ categoriesLoading: false });
        }
    },

    addCategory: async (cat) => {
        await CategoriesApi.create(cat);
        await get().loadCategories();
    },

    updateCategory: async (id, data) => {
        await CategoriesApi.update(id, data);
        await get().loadCategories();
    },

    deleteCategory: async (id) => {
        await CategoriesApi.delete(id);
        await get().loadCategories();
    },

    // ----- Installments -----
    installments: [],
    installmentsLoading: true,

    loadInstallments: async () => {
        set({ installmentsLoading: true });
        try {
            const installments = await InstallmentsApi.getAll();
            set({ installments, installmentsLoading: false });
        } catch (e) {
            console.error('Failed to load installments', e);
            set({ installmentsLoading: false });
        }
    },

    addInstallment: async (inst, periodAmounts, alreadyPaid) => {
        await InstallmentsApi.create(inst, periodAmounts, alreadyPaid);
        await get().loadInstallments();
    },

    payPeriod: async (id) => {
        await InstallmentsApi.payPeriod(id);
        await get().loadInstallments();
        await get().loadAccounts(); // Refresh balance after installment payment
    },

    cancelInstallment: async (id) => {
        await InstallmentsApi.cancel(id);
        await get().loadInstallments();
    },

    getPeriods: (installmentId) => {
        return InstallmentsApi.getPeriods(installmentId);
    },

    // ----- Global -----
    initialized: false,

    init: async () => {
        if (get().initialized) return;
        await Promise.all([
            get().loadAccounts(),
            get().loadCategories(),
            get().loadInstallments(),
        ]);
        set({ initialized: true });
    },

    refreshAll: async () => {
        await Promise.all([
            get().loadAccounts(),
            get().loadCategories(),
            get().loadInstallments(),
        ]);
    },
}));

