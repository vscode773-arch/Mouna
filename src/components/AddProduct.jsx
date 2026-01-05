import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Scan, ChevronDown, Save, Search, Loader2, Camera, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL } from '../config';
import { playScanSound } from '../lib/utils';

export default function AddProduct({ isOpen, onClose, onAdd, initialData }) {
    const [formData, setFormData] = useState({
        barcode: initialData?.barcode || '',
        name: initialData?.name || '',
        category: 'عام',
        expiry: format(new Date(), 'yyyy-MM-dd'),
        department: '',
        quantity: 1,
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
    const barcodeInputRef = useRef(null);

    // Auto-focus barcode input when modal opens to support external scanners
    useEffect(() => {
        if (isOpen && barcodeInputRef.current) {
            setTimeout(() => {
                barcodeInputRef.current.focus();
            }, 300); // 300ms delay to wait for animation
        }
    }, [isOpen]);

    // Ref for the scanner container
    useEffect(() => {
        let html5QrCode;
        if (showScanner && isOpen) {
            // Include a small delay to ensure the DOM element exists
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 30, // MAX FPS
                    qrbox: { width: 300, height: 250 }, // Larger scan area
                    aspectRatio: 1.0,
                    disableFlip: false,
                };

                // Advanced Camera Constraints for HD & Focus
                const cameraConfig = {
                    facingMode: "environment",
                    width: { min: 640, ideal: 1280, max: 1920 }, // Force HD/FHD if available
                    height: { min: 480, ideal: 720, max: 1080 },
                    focusMode: "continuous" // Try to force auto-focus
                };

                html5QrCode.start(
                    cameraConfig,
                    config,
                    (decodedText) => {
                        playScanSound();
                        setFormData(prev => ({ ...prev, barcode: decodedText }));
                        fetchProductDetails(decodedText);
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


    const [categories, setCategories] = useState(['عام']);

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

    const fetchProductDetails = async (barcode) => {
        if (!barcode) return;
        setScanning(true);
        try {
            // 1. Try Local Server First (Inventory & Memory)
            const localRes = await fetch(`${API_URL}/api/products?barcode=${barcode}`);
            if (localRes.ok) {
                const data = await localRes.json();
                const foundProduct = data.data?.[0]; // Get first match

                if (foundProduct) {
                    console.log("Found in local memory/inventory:", foundProduct.name);
                    setFormData(prev => ({
                        ...prev,
                        name: foundProduct.name,
                        category: foundProduct.category || prev.category, // Keep category default if not set
                        image: foundProduct.image || '', // Clear image if not found in memory
                        // If it came from memory (id is null), we reset quantity to 1
                        // If it exists in inventory (id is present), maybe user wants to edit/add more?
                        // Let's assume AddProduct is for "Adding new stock", so keep defaults on expiry/qty.
                    }));
                    setScanning(false);
                    return; // Stop here, we found it!
                }
            }

            // 2. Fallback to OpenFoodFacts (Global DB)
            console.log("Not found locally, trying global DB...");
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const product = data.product;
                setFormData(prev => ({
                    ...prev,
                    name: product.product_name_ar || product.product_name || '', // Use empty if no name found, don't keep old
                    image: product.image_url || '', // Clear image if global DB has none
                }));
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        } finally {
            setScanning(false);
        }
    };

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
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
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
                                        ref={barcodeInputRef}
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        onBlur={(e) => fetchProductDetails(e.target.value)}
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
                                {/* Scanner Container */}
                                {showScanner && (
                                    <div className="mt-4 relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                                        {/* The Camera View */}
                                        <div id="reader" className="w-full h-64 bg-black"></div>

                                        {/* Laser Line Overlay */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            {/* Red Line */}
                                            <div className="w-[90%] h-0.5 bg-red-600 shadow-[0_0_10px_2px_rgba(220,38,38,0.8)] animate-pulse relative z-10"></div>

                                            {/* Scan Area Borders (Optional Visuals) */}
                                            <div className="absolute w-64 h-40 border-2 border-white/30 rounded-lg"></div>
                                            <div className="absolute w-64 h-40 border-2 border-emerald-500/50 rounded-lg animate-ping opacity-20"></div>
                                        </div>

                                        {/* Close Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner(false)}
                                            className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full z-20 backdrop-blur-sm transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>

                                        {/* Instructions Overlay */}
                                        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                                            <span className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                                ماسح متطور V2 🚀
                                            </span>
                                        </div>
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
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">العدد (الكمية)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        placeholder="1"
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
