import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowRight, User, MousePointerClick, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { API_URL } from '../config';

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_URL}/api/audit-logs`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'UPDATE': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
            case 'DELETE': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
            case 'LOGIN': return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return 'إضافة';
            case 'UPDATE': return 'تعديل';
            case 'DELETE': return 'حذف';
            case 'LOGIN': return 'دخول';
            default: return action;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">سجل العمليات</h2>
                <p className="text-slate-500 dark:text-slate-400">تتبع جميع الأنشطة والتغييرات في النظام</p>
            </div>

            {/* Search & Filter */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ابحث في السجل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all dark:text-white"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Filter className="w-5 h-5" />
                    <span>تصفية</span>
                </button>
            </div>

            {/* Logs List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="text-center py-10 text-slate-500">جاري تحميل السجل...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">لا توجد سجلات مطابقة</div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between gap-4 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{log.user?.name || `User #${log.userId}`}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <span>{log.details || 'قام بعملية'}</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-300">{log.target}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                        <Calendar className="w-3 h-3" />
                                        <span>{format(new Date(log.createdAt), 'dd/MM/yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                        <Clock className="w-3 h-3" />
                                        <span>{format(new Date(log.createdAt), 'hh:mm a')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
