import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, X, Zap, Image as ImageIcon, RotateCcw, CheckCircle } from 'lucide-react';

export default function ScanPage() {
    const [isScanning, setIsScanning] = useState(true);
    const [scannedData, setScannedData] = useState(null);

    const simulateScan = () => {
        // Simulate a successful scan after 2 seconds
        setTimeout(() => {
            setScannedData({
                barcode: '6281007823',
                name: 'حليب المراعي كامل الدسم 1L',
                image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300',
                exists: true
            });
            setIsScanning(false);
        }, 1500);
    };

    const resetScan = () => {
        setScannedData(null);
        setIsScanning(true);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col relative overflow-hidden bg-black rounded-3xl shadow-2xl">
            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex gap-4">
                    <button className="p-2 text-white hover:text-yellow-400 transition-colors">
                        <Zap className="w-6 h-6" />
                    </button>
                    <button className="p-2 text-white hover:text-emerald-400 transition-colors" onClick={() => document.getElementById('file-upload').click()}>
                        <ImageIcon className="w-6 h-6" />
                        <input type="file" id="file-upload" className="hidden" accept="image/*" />
                    </button>
                </div>
            </div>

            {/* Main Scanner Area */}
            <div className="flex-1 relative flex items-center justify-center">
                {isScanning ? (
                    <>
                        {/* Simulated Camera Feed Background */}
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-30 blur-sm"></div>

                            {/* Scanning Animation */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="relative w-72 h-72 border-2 border-white/30 rounded-3xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>

                                <motion.div
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                                />

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-white/70 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">وجه الكاميرا نحو الباركود</p>
                                </div>
                            </motion.div>
                        </div>

                        <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
                            <button
                                onClick={simulateScan}
                                className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                            >
                                محاكاة المسح (Simulate)
                            </button>
                        </div>
                    </>
                ) : (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-sm mx-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl text-center relative z-30"
                    >
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{scannedData.name}</h3>
                        <p className="text-slate-500 text-sm mb-6">{scannedData.barcode}</p>

                        <img src={scannedData.image} alt="Product" className="w-full h-48 object-cover rounded-2xl mb-6 shadow-md" />

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={resetScan} className="py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                <RotateCcw className="w-4 h-4" />
                                <span>مسح جديد</span>
                            </button>
                            <button className="py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25">
                                عرض التفاصيل
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
