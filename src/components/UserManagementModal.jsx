import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, User, Edit2, Check } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { API_URL } from '../config';

export default function UserManagementModal({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ id: null, name: '', username: '', password: '', role: 'user' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            resetForm();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/users`);
            if (res.ok) setUsers(await res.json());
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ id: null, name: '', username: '', password: '', role: 'user' });
        setEditMode(false);
    };

    const handleEditClick = (user) => {
        setFormData({
            id: user.id,
            name: user.name,
            username: user.username,
            password: '', // Don't show password
            role: user.role
        });
        setEditMode(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = editMode
                ? `${API_URL}/api/users/${formData.id}`
                : `${API_URL}/api/users`;

            const method = editMode ? 'PUT' : 'POST';

            const payload = { ...formData };
            if (editMode && !payload.password) delete payload.password; // Don't send empty password on update

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                resetForm();
                fetchUsers();
            } else {
                alert("فشلت العملية");
            }
        } catch (error) {
            console.error("Operation failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (user) => {
        setDeleteConfirm({
            isOpen: true,
            userId: user.id,
            userName: user.name
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm.userId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/users/${deleteConfirm.userId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
                setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
                // alert("تم حذف المستخدم بنجاح"); // Removed to use smoother interaction
            } else {
                const data = await res.json();
                alert(`فشل الحذف: ${data.error || res.statusText}`);
            }
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("حدث خطأ في الاتصال بالخادم");
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
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-emerald-500" />
                                    إدارة المستخدمين
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 dark:text-gray-400" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Add/Edit User Form */}
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                    <div className="md:col-span-2 flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-sm text-slate-500">{editMode ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
                                        {editMode && <button type="button" onClick={resetForm} className="text-xs text-red-500 hover:underline">إلغاء التعديل</button>}
                                    </div>

                                    <input required placeholder="الاسم الكامل" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputFieldClass} />
                                    <input required placeholder="اسم المستخدم" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className={inputFieldClass} />
                                    <input type="password" placeholder={editMode ? "كلمة المرور (اتركه فارغاً للإبقاء عليها)" : "كلمة المرور"} required={!editMode} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={inputFieldClass} />

                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={inputFieldClass}>
                                        <option value="user">مستخدم عادي</option>
                                        <option value="admin">مسؤول (Admin)</option>
                                    </select>

                                    <button type="submit" disabled={isSubmitting} className={`md:col-span-2 ${editMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all active:scale-95 disabled:opacity-50`}>
                                        {editMode ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {editMode ? 'حفظ التغييرات' : 'إضافة مستخدم'}
                                    </button>
                                </form>

                                {/* Users List */}
                                <div className="space-y-3">
                                    {loading ? <p className="text-center text-gray-500">جاري التحميل...</p> : users.map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">@{user.username} • <span className="bg-gray-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px]">{user.role}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditClick(user)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="تعديل">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(user)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="حذف">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <ConfirmDialog
                        isOpen={deleteConfirm.isOpen}
                        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                        onConfirm={handleConfirmDelete}
                        title="حذف المستخدم"
                        message={`هل أنت متأكد من رغبتك في حذف المستخدم "${deleteConfirm.userName}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم فقدان جميع صلاحيات الدخول الخاصة به.`}
                        confirmText="نعم، احذف المستخدم"
                        cancelText="إلغاء"
                        isDestructive={true}
                        isLoading={isDeleting}
                    />
                </>
            )}
        </AnimatePresence>
    );
}

// Simple CSS class for inputs to avoid repetition
const inputFieldClass = "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white";
