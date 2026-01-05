import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    History,
    Settings,
    LogOut,
    Menu,
    Scan,
    User,
    Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
        { icon: Package, label: 'المنتجات', path: '/products' },
        { icon: Scan, label: 'فحص', path: '/scan', isFab: true }, // Floating Action Button for Scan
        { icon: History, label: 'السجل', path: '/audit-log' },
        { icon: Settings, label: 'الإعدادات', path: '/settings' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans" dir="rtl">

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 h-screen sticky top-0 z-40 shadow-xl">
                <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/50">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Package className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">Mouna App</h1>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {navItems.filter(i => !i.isFab).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group font-medium",
                                isActive
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-700/50">
                    <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 flex items-center gap-3 mb-3">
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=random`} alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate dark:text-white">{user?.name || user?.username}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل خروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <Package className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg dark:text-white">Mouna</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400">
                            <Bell className="w-6 h-6" />
                        </button>
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-8 h-8 rounded-full border border-gray-200" />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900 p-4 pb-24 md:p-8">
                    <Outlet />
                </div>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between z-50 pb-safe">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        if (item.isFab) {
                            return (
                                <div key={item.path} className="relative -top-6">
                                    <div
                                        onClick={() => navigate('/products', { state: { openAddWithScanner: true } })}
                                        className="cursor-pointer"
                                    >
                                        <motion.div
                                            whileTap={{ scale: 0.9 }}
                                            className="w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white"
                                        >
                                            <item.icon className="w-6 h-6" />
                                        </motion.div>
                                    </div>
                                </div>
                            )
                        }
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                                    isActive ? "text-emerald-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                )}
                            >
                                <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>
            </main>
        </div>
    );
}
