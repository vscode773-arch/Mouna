import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Save, Trash2, AlertTriangle, CheckCircle, Upload, Camera } from 'lucide-react';
import { format } from 'date-fns';

export default function EditProductModal({ product, isOpen, onClose, onUpdate, onDelete }) {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        category: product?.category || 'عام',
        expiry: product?.expiry ? format(new Date(product.expiry), 'yyyy-MM-dd') : '',
        department: product?.department || '',
        quantity: product?.quantity || 1,
        image: product?.image || ''
    });
    const [loading, setLoading] = useState(false);
    const [deleteStep, setDeleteStep] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const fileInputRef = useRef(null);

    const categories = ['الألبان', 'المشروبات', 'الحبوب', 'المعلبات', 'الزيوت', 'اللحوم', 'الخضروات', 'الفواكه', 'المنظفات', 'أخرى'];
    const deleteReasons = ['تم البيع', 'انتهت الصلاحية', 'مرتجع للشركة', 'أخرى'];

    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const resizedImage = await resizeImage(file);
                setFormData(prev => ({ ...prev, image: resizedImage }));
            } catch (error) {
                console.error("Error resizing image:", error);
            }
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate({ ...formData, id: product.id });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteReason) return;
        setLoading(true);
        try {
            await onDelete(product.id, deleteReason, customReason);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden relative max-h-[90vh] overflow-y-auto">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold dark:text-white">
                                    {deleteStep ? 'حذف المنتج' : 'تعديل المنتج'}
                                </h2>
                                <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {!deleteStep ? (
                                /* EDIT FORM */
                                <form onSubmit={handleUpdate} className="space-y-4">

                                    {/* Image Edit Section */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">صورة المنتج</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 relative">
                                                {formData.image ? (
                                                    <img src={formData.image} alt="Product" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Camera className="w-8 h-8 opacity-50" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    تغيير الصورة
                                                </button>
                                                {formData.image && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, image: '' })}
                                                        className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 p-2 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">اسم المنتج</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">القسم</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">تاريخ الانتهاء</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.expiry}
                                                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">العدد (الكمية)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                        />
                                    </div>

                                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setDeleteStep(true)}
                                            className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            حذف
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
                                        >
                                            {loading ? 'جاري الحفظ...' : (
                                                <>
                                                    <Save className="w-5 h-5" />
                                                    حفظ التعديلات
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                /* DELETE CONFIRMATION */
                                <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">هل أنت متأكد من حذف المنتج؟</h3>
                                            <p className="text-red-600/80 dark:text-red-400/80 text-xs mt-1">سيتم أرشفة عملية الحذف في السجل.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">سبب الحذف:</label>
                                        <div className="space-y-2">
                                            {deleteReasons.map(reason => (
                                                <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="deleteReason"
                                                        value={reason}
                                                        checked={deleteReason === reason}
                                                        onChange={(e) => setDeleteReason(e.target.value)}
                                                        className="w-4 h-4 text-red-500 focus:ring-red-500"
                                                    />
                                                    <span className="text-slate-700 dark:text-slate-300">{reason}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {deleteReason === 'أخرى' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <textarea
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white mt-2"
                                                placeholder="اكتب سبب الحذف..."
                                                value={customReason}
                                                onChange={(e) => setCustomReason(e.target.value)}
                                                rows={3}
                                            />
                                        </motion.div>
                                    )}

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => setDeleteStep(false)}
                                            className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={!deleteReason || loading}
                                            className="flex-[2] bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all"
                                        >
                                            {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
