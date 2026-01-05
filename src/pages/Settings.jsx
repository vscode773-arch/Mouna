import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { User, Bell, Shield, Database, Moon, Sun, Smartphone, LogOut, Save, Layers, Upload, Download, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserManagementModal from '../components/UserManagementModal';
import CategoryManagementModal from '../components/CategoryManagementModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { API_URL } from '../config';

export default function Settings() {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedMode === 'true' || (savedMode === null && isSystemDark);
    });

    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);
    const [notifications, setNotifications] = useState(() => localStorage.getItem('notifications') === 'true');

    // Modals State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Restore & Confirmation State
    const fileInputRef = useRef(null);
    const [confirm, setConfirm] = useState({
        isOpen: false,
        type: '',
        message: '',
        action: null,
        variant: 'danger',
        showCancel: true,
        confirmText: 'نعم',
        title: ''
    });
    const [isRestoring, setIsRestoring] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Form State
    const [name, setName] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const toggleDarkMode = () => {
        setDarkMode(prev => !prev);
    };

    const toggleNotifications = (e) => {
        const checked = e.target.checked;
        setNotifications(checked);
        localStorage.setItem('notifications', checked);
        if (checked) {
            enableNotificationsManual();
        }
    };

    const enableNotificationsManual = async () => {
        alert("جاري محاولة تفعيل الإشعارات..."); // Debug Alert 1
        try {
            // Check if blocked
            const state = await OneSignal.getNotificationPermission();
            alert(`حالة الإذن الحالية: ${state}`); // Debug Alert 2

            if (state === 'blocked') {
                alert("الإشعارات محظورة. يرجى تفعيلها من إعدادات المتصفح (بجانب شريط العنوان).");
                return;
            }

            await OneSignal.Slidedown.promptPush();

            // Fallback request
            await OneSignal.User.PushSubscription.optIn();

            alert("تم إرسال الطلب.");
        } catch (error) {
            console.error("Error enabling notifications:", error);
            alert(`حدث خطأ: ${error.message}`);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile(name);
            setConfirm({
                isOpen: true,
                type: 'info',
                variant: 'success',
                title: 'حفظ الإعدادات',
                message: 'تم حفظ تغييرات الملف الشخصي بنجاح!',
                confirmText: 'ممتاز',
                showCancel: false,
                action: () => setConfirm(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            setConfirm({
                isOpen: true,
                type: 'error',
                variant: 'danger',
                title: 'خطأ في الحفظ',
                message: 'لم نتمكن من حفظ التغييرات. يرجى المحاولة لاحقاً.',
                confirmText: 'إغلاق',
                showCancel: false,
                action: () => setConfirm(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch(`${API_URL}/api/backup`);
            if (!response.ok) throw new Error('Backup failed');
            const data = await response.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MOUNA_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setConfirm({
                isOpen: true,
                type: 'info',
                variant: 'success',
                title: 'تم النسخ بنجاح',
                message: `تم حفظ ملف النسخة الاحتياطية بنجاح!\n\nاسم الملف: MOUNA_BACKUP_${new Date().toISOString().split('T')[0]}.json\nالمكان: مجلد التنزيلات (Downloads)`,
                confirmText: 'حسناً',
                showCancel: false,
                action: () => setConfirm(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            console.error("Backup failed", error);
            setConfirm({
                isOpen: true,
                type: 'error',
                variant: 'danger',
                title: 'فشل عملية النسخ',
                message: 'حدث خطأ أثناء محاولة إنشاء النسخة الاحتياطية. يرجى التأكد من تشغيل الخادم.',
                confirmText: 'إغلاق',
                showCancel: false,
                action: () => setConfirm(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setConfirm({
                isOpen: true,
                type: 'restore',
                variant: 'danger',
                title: 'استعادة البيانات',
                message: 'هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. لا يمكن التراجع عن هذا الإجراء.',
                confirmText: 'نعم، استعادة',
                showCancel: true,
                action: () => performRestore(file)
            });
        }
        e.target.value = ''; // Reset input
    };

    const performRestore = async (file) => {
        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const res = await fetch(`${API_URL}/api/restore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    setConfirm({
                        isOpen: true,
                        type: 'info',
                        variant: 'success',
                        title: 'تمت الاستعادة بنجاح',
                        message: 'تمت استعادة جميع البيانات بنجاح! سيتم إعادة تحميل التطبيق لتطبيق التغييرات.',
                        confirmText: 'إعادة تحميل',
                        showCancel: false,
                        action: () => window.location.reload()
                    });
                } else {
                    const err = await res.json();
                    throw new Error(err.error);
                }
            } catch (error) {
                console.error("Restore failed", error);
                setConfirm({
                    isOpen: true,
                    type: 'error',
                    variant: 'danger',
                    title: 'فشل الاستعادة',
                    message: `فشلت عملية استعادة البيانات: ${error.message || 'الملف تالف أو غير صالح'}`,
                    confirmText: 'إغلاق',
                    showCancel: false,
                    action: () => setConfirm(prev => ({ ...prev, isOpen: false }))
                });
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    const Section = ({ title, icon: Icon, children, className }) => (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-6 ${className}`}>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h3>
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">الإعدادات</h2>
                <p className="text-slate-500 dark:text-slate-400">تخصيص التطبيق وإدارة الحساب</p>
            </div>

            <Section title="الملف الشخصي" icon={User}>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=random`}
                            alt="Profile"
                            className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-700"
                        />
                        <button className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-white dark:border-slate-800">
                            <User className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم</label>
                                <input type="text" defaultValue={user?.username} disabled className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed" />
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section title="المظهر والتطبيق" icon={Smartphone}>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors cursor-pointer" onClick={toggleDarkMode}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-orange-100 text-orange-500'}`}>
                            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">الوضع الليلي</p>
                            <p className="text-xs text-slate-500">التبديل بين المظهر الفاتح والداكن</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${darkMode ? '-translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">الإشعارات</p>
                            <p className="text-xs text-slate-500">تلقي تنبيهات عن المنتجات القريبة من الانتهاء</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={enableNotificationsManual}
                            className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            تفعيل
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications} onChange={toggleNotifications} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>
                </div>
            </Section>

            {user?.role === 'admin' && (
                <Section title="إدارة النظام (مشرف فقط)" icon={Shield}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsUserModalOpen(true)}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 transition-all border border-transparent group"
                        >
                            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">إدارة المستخدمين</span>
                            <User className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                        </button>
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 transition-all border border-transparent group"
                        >
                            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">إدارة الأقسام</span>
                            <Layers className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                        </button>
                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 transition-all border border-transparent group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {isBackingUp ? 'جاري إنشاء النسخة...' : 'حفظ نسخة احتياطية'}
                            </span>
                            {isBackingUp ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />}
                        </button>
                        <button
                            onClick={handleRestoreClick}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-200 transition-all border border-transparent group"
                        >
                            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">استعادة البيانات</span>
                            <RefreshCcw className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                    </div>
                </Section>
            )}

            <button
                onClick={handleLogout}
                className="w-full bg-white dark:bg-slate-800 text-red-500 font-bold p-4 rounded-2xl shadow-sm border border-transparent hover:border-red-100 dark:border-slate-700/50 flex items-center justify-center gap-2 mb-6 active:scale-95 transition-all"
            >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج من التطبيق</span>
            </button>

            <div className="flex justify-end pt-4 md:pb-0">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                </button>
            </div>

            {/* Credits Section */}
            <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-8 pb-24 md:pb-8">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">جميع حقوق التطوير محفوظة © 2026</p>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">برمجة وتطوير: محمد أمين الكامل</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600">يمنع منعاً باتاً النسخ أو التعديل دون إذن كتابي</p>
            </div>

            {/* Management Modals */}
            <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
            <CategoryManagementModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />

            <ConfirmDialog
                isOpen={confirm.isOpen}
                onClose={() => setConfirm({ ...confirm, isOpen: false })}
                onConfirm={confirm.action}
                title={confirm.title}
                message={confirm.message}
                confirmText={confirm.confirmText || "نعم"}
                cancelText="إلغاء"
                isDestructive={confirm.type === 'restore' && confirm.variant !== 'success'} // Only destructive if asking for restore, not success msg
                variant={confirm.variant}
                isLoading={isRestoring}
                showCancel={confirm.showCancel !== false}
            />
        </motion.div>
    );
}
