import { useStore } from '../store/useStore';

export function useTransactions(limit?: number) {
    const transactions = useStore(s => s.transactions);
    const loading = useStore(s => s.transactionsLoading);
    const error = useStore(s => s.transactionsError);
    const refreshTransactionsBase = useStore(s => s.loadTransactions);
    const addTransaction = useStore(s => s.addTransaction);
    const updateTransaction = useStore(s => s.updateTransaction);
    const deleteTransaction = useStore(s => s.deleteTransaction);

    return {
        transactions,
        loading,
        error,
        refreshTransactions: () => refreshTransactionsBase(limit),
        addTransaction,
        updateTransaction,
        deleteTransaction,
    };
}
