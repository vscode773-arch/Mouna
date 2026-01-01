import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    Clock,
    CheckCircle,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        expiredCount: 0,
        expiringSoonCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard-stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: 'إجمالي المنتجات',
            value: stats.totalProducts,
            icon: Package,
            color: 'bg-blue-500',
            description: 'جميع المنتجات المسجلة في النظام'
        },
        {
            title: 'منتهية الصلاحية',
            value: stats.expiredCount,
            icon: AlertTriangle,
            color: 'bg-red-500',
            description: 'منتجات يجب إزالتها فوراً',
            alert: stats.expiredCount > 0
        },
        {
            title: 'تنتهي قريباً',
            value: stats.expiringSoonCount,
            icon: Clock,
            color: 'bg-orange-500',
            description: 'خلال 7 أيام القادمة',
            alert: stats.expiringSoonCount > 0
        },
        {
            title: 'حالة النظام',
            value: 'ممتازة',
            icon: CheckCircle,
            color: 'bg-emerald-500',
            description: 'جميع الخدمات تعمل بشكل جيد'
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                        نظرة عامة
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">ملخص سريع لحالة المخزون والعمليات</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-emerald-500"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={card.title}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 relative overflow-hidden group hover:shadow-lg transition-shadow"
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500 ${card.color}`} />

                        <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${card.color} bg-opacity-10 text-white`}>
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${card.color}`}>
                                        <card.icon className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                {card.alert && (
                                    <span className="flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{card.title}</h3>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {loading ? '-' : card.value}
                                </div>
                                <p className="text-xs text-slate-400 mt-2 font-medium">{card.description}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
