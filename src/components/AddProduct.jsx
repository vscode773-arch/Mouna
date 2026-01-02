import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Scan, ChevronDown, Save, Search, Loader2, Camera, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL } from '../config';

export default function AddProduct({ isOpen, onClose, onAdd, initialData }) {
    const [formData, setFormData] = useState({
        barcode: initialData?.barcode || '',
        name: initialData?.name || '',
        category: 'عام',
        expiry: format(new Date(), 'yyyy-MM-dd'),
        department: '',
        image: initialData?.image || ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        } else if (!isOpen) {
            // Reset when closed
            setFormData({ barcode: '', name: '', category: 'عام', expiry: format(new Date(), 'yyyy-MM-dd'), department: '', image: '' });
        }
    }, [initialData, isOpen]);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const fileInputRef = useRef(null);
    const scannerRef = useRef(null);

    // Ref for the scanner container
    useEffect(() => {
        let html5QrCode;
        if (showScanner && isOpen) {
            // Include a small delay to ensure the DOM element exists
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        setFormData(prev => ({ ...prev, barcode: decodedText }));
                        fetchProductFromGlobalDB(decodedText);
                        setShowScanner(false);
                        if (html5QrCode.isScanning) {
                            html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // console.log(errorMessage);
                    }
                ).catch(err => {
                    console.error("Error starting scanner", err);
                });
            }, 100);
            return () => clearTimeout(timer);
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
            }
        };
    }, [showScanner, isOpen]);


    const [categories, setCategories] = useState(['الألبان', 'المشروبات', 'الحبوب', 'المعلبات', 'الزيوت', 'اللحوم', 'الخضروات', 'الفواكه', 'المنظفات', 'أخرى']);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_URL}/api/categories`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        setCategories(data.map(c => c.name));
                    }
                }
            } catch (error) {
                console.error("Failed to load categories", error);
            }
        };
        fetchCategories();
    }, []);

    const fetchProductFromGlobalDB = async (barcode) => {
        if (!barcode) return;
        setScanning(true);
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const product = data.product;
                setFormData(prev => ({
                    ...prev,
                    name: product.product_name_ar || product.product_name || prev.name,
                    image: product.image_url || prev.image,
                }));
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        } finally {
            setScanning(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd(formData);
            onClose();
            setFormData({ barcode: '', name: '', category: 'عام', expiry: format(new Date(), 'yyyy-MM-dd'), department: '', image: '' });
        } catch (error) {
            console.error("Failed to add product:", error);
            alert("حدث خطأ أثناء حفظ المنتج. الرجاء المحاولة مرة أخرى.");
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
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl z-50 p-6 pb-40 shadow-2xl border-t border-slate-100 dark:border-slate-700 block max-w-md mx-auto h-[85vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold dark:text-white">إضافة منتج جديد</h2>
                            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Barcode Search */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">الباركود</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        onBlur={(e) => fetchProductFromGlobalDB(e.target.value)}
                                        placeholder="امسح الباركود..."
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white text-center font-mono tracking-wider"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowScanner(!showScanner)}
                                        className="bg-slate-900 text-white dark:bg-emerald-500 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-600 transition-colors flex items-center justify-center"
                                    >
                                        <Scan className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Camera Viewfinder */}
                                {showScanner && (
                                    <div className="mt-4 overflow-hidden rounded-xl border-2 border-emerald-500 relative bg-black">
                                        <div id="reader" className="w-full"></div>
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner(false)}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Image Preview & Upload */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">صورة المنتج</label>

                                {formData.image ? (
                                    <div className="w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-4 relative group">
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full text-white transition-colors"
                                            >
                                                <Upload className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur rounded-full text-white transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all gap-2"
                                    >
                                        <Camera className="w-8 h-8" />
                                        <span className="text-sm font-medium">التقاط صورة </span>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                />
                            </div>

                            {/* Product Name */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">اسم المنتج</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="اسم المنتج..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                />
                            </div>

                            {/* Category & Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">القسم</label>
                                    <div className="relative">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 outline-none dark:text-white"
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">المكان</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="مثال: رف 1"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">تاريخ الانتهاء</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={formData.expiry}
                                        onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none dark:text-white"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>حفظ المنتج</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
