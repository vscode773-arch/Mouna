import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Layers } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { API_URL } from '../config';

export default function CategoryManagementModal({ isOpen, onClose }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Confirmation State
    const [confirm, setConfirm] = useState({ isOpen: false, id: null, name: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) fetchCategories();
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/categories`);
            if (res.ok) setCategories(await res.json());
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setIsAdding(true);
        try {
            const res = await fetch(`${API_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategory })
            });
            if (res.ok) {
                setNewCategory('');
                fetchCategories();
            }
        } catch (error) {
            console.error("Failed to add category", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (cat) => {
        setConfirm({ isOpen: true, id: cat.id, name: cat.name });
    };

    const handleConfirmDelete = async () => {
        if (!confirm.id) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/categories/${confirm.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
                setConfirm({ isOpen: false, id: null, name: '' });
            }
        } catch (error) {
            console.error("Failed to delete category", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-emerald-500" />
                                    إدارة الأقسام
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 dark:text-gray-400" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                                    <input
                                        required
                                        placeholder="اسم القسم الجديد..."
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                                    />
                                    <button type="submit" disabled={isAdding} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg flex items-center gap-2 font-bold transition-all active:scale-95">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </form>

                                <div className="space-y-2">
                                    {loading ? <p className="text-center text-gray-500">جاري التحميل...</p> :
                                        categories.length === 0 ? <p className="text-center text-gray-400 py-4">لا توجد أقسام مضافة</p> :
                                            categories.map(cat => (
                                                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg group hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-all">
                                                    <span className="font-medium text-gray-700 dark:text-white">{cat.name}</span>
                                                    <button onClick={() => handleDeleteClick(cat)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <ConfirmDialog
                        isOpen={confirm.isOpen}
                        onClose={() => setConfirm({ ...confirm, isOpen: false })}
                        onConfirm={handleConfirmDelete}
                        title="حذف القسم"
                        message={`هل أنت متأكد من حذف القسم "${confirm.name}"؟`}
                        confirmText="نعم، حذف"
                        cancelText="إلغاء"
                        isDestructive={true}
                        isLoading={isDeleting}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
