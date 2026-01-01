import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "تأكيد الإجراء",
    message = "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.",
    confirmText = "نعم، احذف",
    cancelText = "إلغاء",
    isDestructive = false,
    variant = 'danger', // danger, success, info
    isLoading = false,
    showCancel = true
}) {
    // Determine styles based on variant
    // If isDestructive is strictly true (managed by older calls), force danger.
    const mode = isDestructive ? 'danger' : variant;

    let Icon = AlertTriangle;
    let colorClass = 'bg-amber-100 text-amber-500 dark:bg-amber-500/20';
    let btnClass = 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25';

    if (mode === 'danger') {
        Icon = AlertTriangle;
        colorClass = 'bg-red-100 text-red-500 dark:bg-red-500/20';
        btnClass = 'bg-red-500 hover:bg-red-600 shadow-red-500/25';
    } else if (mode === 'success') {
        Icon = CheckCircle;
        colorClass = 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20';
        btnClass = 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25';
    } else if (mode === 'info') {
        Icon = Info;
        colorClass = 'bg-blue-100 text-blue-500 dark:bg-blue-500/20';
        btnClass = 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25';
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700">
                            <div className="p-6 text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${colorClass}`}>
                                    <Icon className="w-8 h-8" />
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    {title}
                                </h3>

                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed whitespace-pre-line">
                                    {message}
                                </p>

                                <div className="flex gap-3">
                                    {showCancel && (
                                        <button
                                            onClick={onClose}
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            {cancelText}
                                        </button>
                                    )}
                                    <button
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${btnClass}`}
                                    >
                                        {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        {confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
