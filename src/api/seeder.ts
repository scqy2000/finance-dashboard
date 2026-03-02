import { AccountsApi } from './db';

const SEED_ACCOUNTS = [
    { name: '招行储蓄卡', type: 'asset', balance: 14480.00, color: '#e11d48' },
    { name: '支付宝余额', type: 'asset', balance: 2500.00, color: '#0284c7' },
    { name: '花呗', type: 'liability', balance: -1500.00, color: '#0ea5e9', credit_limit: 10000, statement_date: 1, due_date: 10 },
    { name: '工行信用卡', type: 'liability', balance: -3200.00, color: '#475569', credit_limit: 50000, statement_date: 5, due_date: 25 },
    { name: '京东白条', type: 'liability', balance: -700.00, color: '#dc2626', credit_limit: 8000, statement_date: 15, due_date: 5 }
];

export const seedDatabase = async () => {
    try {
        console.log('Seeding database with initial data...');

        const existingAccounts = await AccountsApi.getAll();
        for (const acc of existingAccounts) {
            await AccountsApi.delete(acc.id);
        }

        for (const acc of SEED_ACCOUNTS) {
            await AccountsApi.create(acc as any);
        }
        console.log('Database seeded successfully.');
        return true;
    } catch (e) {
        console.error('Failed to seed:', e);
        return false;
    }
};
