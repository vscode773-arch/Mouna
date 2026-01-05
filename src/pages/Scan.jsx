import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, CheckCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { playScanSound } from '../lib/utils';
import { API_URL } from '../config';

export default function ScanPage() {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(true); // New Loading State
    const [scannedData, setScannedData] = useState(null);
    const scannerRef = useRef(null);

    // CSS to force clean full-screen video and hide library overlays
    const globalScannerStyles = `
        #reader {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            overflow: hidden !important;
        }
        #reader video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
        }
        /* HIDE LIBRARY OVERLAYS causing "Ghost Frames" */
        #reader canvas, 
        #reader div[style*="position: absolute"] { 
            display: none !important; 
        }
    `;

    useEffect(() => {
        let html5QrCode;

        const startScanner = async () => {
            // Instant Start - No Delay
            try {
                if (!document.getElementById("reader")) return;

                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 30,
                    qrbox: { width: 250, height: 250 }, // Logical box only
                    aspectRatio: 1.0,
                    disableFlip: false,
                };

                // HD Configuration
                const cameraConfig = {
                    facingMode: "environment"
                };

                await html5QrCode.start(
                    cameraConfig,
                    config,
                    (decodedText) => {
                        playScanSound();
                        handleScanSuccess(decodedText);
                        // Stop scanning immediately after success
                        if (html5QrCode.isScanning) {
                            html5QrCode.stop().catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // ignore failures
                    }
                );

                setIsLoading(false); // Camera is ready!

            } catch (err) {
                console.error("Scanner Error:", err);
                setIsLoading(false);
                alert("تعذر تشغيل الكاميرا. تأكد من الصلاحيات.");
            }
        };

        if (isScanning) {
            startScanner();
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => { });
            }
        };
    }, [isScanning]);

    const handleScanSuccess = async (barcode) => {
        setIsScanning(false);
        setIsLoading(true); // Show loading while fetching data

        // 1. Try Local Server First (Inventory & Memory)
        try {
            const localResponse = await fetch(`${API_URL}/api/products?barcode=${barcode}`);
            if (localResponse.ok) {
                const data = await localResponse.json();
                const foundProduct = data.data?.[0];

                if (foundProduct) {
                    setScannedData({
                        barcode: barcode,
                        name: foundProduct.name,
                        image: foundProduct.image || 'https://via.placeholder.com/300',
                        quantity: foundProduct.id ? foundProduct.quantity : 0,
                        exists: !!foundProduct.id
                    });
                    setIsLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Local DB Error", error);
        }

        // 2. Global Fallback
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();

            if (data.status === 1) {
                setScannedData({
                    barcode: barcode,
                    name: data.product.product_name_ar || data.product.product_name || 'منتج غير معروف',
                    image: data.product.image_url || 'https://via.placeholder.com/300',
                    exists: false
                });
            } else {
                setScannedData({
                    barcode: barcode,
                    name: 'منتج غير موجود',
                    image: 'https://via.placeholder.com/300',
                    exists: false
                });
            }
        } catch (error) {
            setScannedData({
                barcode: barcode,
                name: 'خطأ في جلب البيانات',
                image: 'https://via.placeholder.com/300',
                exists: false
            });
        }
        setIsLoading(false);
    };

    const resetScan = () => {
        setScannedData(null);
        setIsScanning(true);
        setIsLoading(true);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <style>{globalScannerStyles}</style>

            {/* Header Controls (Absolute Top) */}
            <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative w-full h-full bg-black">

                {isScanning ? (
                    <>
                        {/* Loading Spinner (Centered) */}
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black text-white">
                                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                                <p className="text-emerald-500/80 font-medium">جاري تشغيل الكاميرا...</p>
                            </div>
                        )}

                        {/* Camera Element */}
                        <div id="reader" className="w-full h-full absolute inset-0 bg-black"></div>

                        {/* CUSTOM UI OVERLAY (Our clean frame) */}
                        {!isLoading && (
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                {/* Dark Background Shading */}
                                <div className="absolute inset-0 bg-black/40"></div>

                                {/* Masking: Clear Center Hole */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[75%] aspect-square max-w-sm relative">

                                        {/* The Hole (Clip Path visualization via box-shadow hack) */}
                                        <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>

                                        {/* Bright Corners */}
                                        <div className="absolute top-0 left-0 w-10 h-10 border-t-[6px] border-l-[6px] border-emerald-500 rounded-tl-3xl -mt-1 -ml-1"></div>
                                        <div className="absolute top-0 right-0 w-10 h-10 border-t-[6px] border-r-[6px] border-emerald-500 rounded-tr-3xl -mt-1 -mr-1"></div>
                                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[6px] border-l-[6px] border-emerald-500 rounded-bl-3xl -mb-1 -ml-1"></div>
                                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[6px] border-r-[6px] border-emerald-500 rounded-br-3xl -mb-1 -mr-1"></div>

                                        {/* Laser Line */}
                                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,1)] animate-pulse"></div>
                                    </div>
                                </div>

                                {/* Text Label */}
                                <div className="absolute bottom-20 left-0 right-0 text-center">
                                    <span className="inline-block px-6 py-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 text-sm font-bold border border-white/10 shadow-xl">
                                        ماسح ذكي V3 ⚡
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Show Result Card */
                    <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            {/* ... Result UI ... */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-500/10 rounded-b-[100%] -mt-16"></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-white dark:ring-slate-800 shadow-lg">
                                    {isLoading ? (
                                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                                    )}
                                </div>

                                {isLoading ? (
                                    <p className="text-lg font-medium animate-pulse">جاري البحث...</p>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 text-center">{scannedData?.name}</h3>
                                        <p className="text-slate-500 text-sm mb-4 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{scannedData?.barcode}</p>

                                        {scannedData?.exists && (
                                            <div className="mb-4 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-200">
                                                متوفر في المخزون: {scannedData.quantity}
                                            </div>
                                        )}

                                        <img src={scannedData?.image} alt="Product" className="w-32 h-32 object-contain bg-white rounded-xl mb-6 shadow-inner p-2 border border-slate-100" />

                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            <button onClick={resetScan} className="py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                                <RotateCcw className="w-5 h-5" />
                                                <span>مسح جديد</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/products', {
                                                    state: {
                                                        openAddModal: true,
                                                        productData: {
                                                            barcode: scannedData.barcode,
                                                            name: scannedData.exists ? scannedData.name : '',
                                                            image: scannedData.exists ? scannedData.image : ''
                                                        }
                                                    }
                                                })}
                                                className="py-3.5 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30"
                                            >
                                                إضافة/ادارة
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
