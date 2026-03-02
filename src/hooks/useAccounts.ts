import { useStore } from '../store/useStore';

export function useAccounts() {
    const accounts = useStore(s => s.accounts);
    const loading = useStore(s => s.accountsLoading);
    const error = useStore(s => s.accountsError);
    const refreshAccounts = useStore(s => s.loadAccounts);
    const addAccount = useStore(s => s.addAccount);
    const updateAccount = useStore(s => s.updateAccount);
    const deleteAccount = useStore(s => s.deleteAccount);

    return {
        accounts,
        loading,
        error,
        refreshAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
    };
}
