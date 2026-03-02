import { useStore } from '../store/useStore';

export function useCategories() {
    const categories = useStore(s => s.categories);
    const loading = useStore(s => s.categoriesLoading);
    const refreshCategories = useStore(s => s.loadCategories);
    const addCategory = useStore(s => s.addCategory);
    const updateCategory = useStore(s => s.updateCategory);
    const deleteCategory = useStore(s => s.deleteCategory);

    return {
        categories,
        loading,
        refreshCategories,
        addCategory,
        updateCategory,
        deleteCategory,
    };
}
