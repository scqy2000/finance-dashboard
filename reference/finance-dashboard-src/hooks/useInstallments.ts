import { useStore } from '../store/useStore';

export function useInstallments() {
    const installments = useStore(s => s.installments);
    const loading = useStore(s => s.installmentsLoading);
    const refreshInstallments = useStore(s => s.loadInstallments);
    const addInstallment = useStore(s => s.addInstallment);
    const payPeriod = useStore(s => s.payPeriod);
    const cancelInstallment = useStore(s => s.cancelInstallment);
    const getPeriods = useStore(s => s.getPeriods);

    return {
        installments,
        loading,
        refreshInstallments,
        addInstallment,
        payPeriod,
        cancelInstallment,
        getPeriods,
    };
}
