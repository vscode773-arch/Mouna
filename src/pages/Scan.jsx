import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, X, Zap, Image as ImageIcon, RotateCcw, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { playScanSound } from '../lib/utils';
import { API_URL } from '../config';

export default function ScanPage() {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(true);
    const [scannedData, setScannedData] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        let html5QrCode;
        if (isScanning) {
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                // Safely Request Camera with HD preference
                const cameraConfig = {
                    facingMode: "environment"
                    // Library will pick best resolution automatically
                };

                const config = {
                    fps: 30,
                    qrbox: { width: 300, height: 250 }, // Consistent larger size
                    aspectRatio: 1.0,
                    disableFlip: false,
                };

                html5QrCode.start(
                    cameraConfig,
                    config,
                    (decodedText) => {
                        playScanSound();
                        handleScanSuccess(decodedText);
                        if (html5QrCode.isScanning) {
                            html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // ignore
                    }
                ).catch(err => {
                    console.error("Error starting scanner", err);
                    alert("فشل تشغيل الكاميرا: " + err);
                });
            }, 100);
            return () => {
                clearTimeout(timer);
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
                }
            };
        }
    }, [isScanning]);

    const handleScanSuccess = async (barcode) => {
        // 1. Try Local Server First (Inventory & Memory)
        try {
            const localResponse = await fetch(`${API_URL}/api/products?barcode=${barcode}`);
            if (localResponse.ok) {
                const data = await localResponse.json();
                const foundProduct = data.data?.[0]; // Get first match

                if (foundProduct) {
                    console.log("Scan Page: Found in local memory/inventory:", foundProduct.name);
                    setScannedData({
                        barcode: barcode,
                        name: foundProduct.name,
                        image: foundProduct.image || 'https://via.placeholder.com/300',
                        quantity: foundProduct.id ? foundProduct.quantity : 0, // 0 if from memory
                        exists: !!foundProduct.id // True if in inventory, False if just memory
                    });
                    setIsScanning(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to check local DB", error);
        }

        // 2. If not found locally, fetch from OpenFoodFacts
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
        setIsScanning(false);
    };

    const resetScan = () => {
        setScannedData(null);
        setIsScanning(true);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col relative overflow-hidden bg-black rounded-3xl shadow-2xl">
            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center">
                <button onClick={() => navigate(-1)} className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Scanner Area */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                {isScanning ? (
                    <div className="w-full h-full relative">
                        {/* CSS to force Video Fill Cleanly */}
                        <style>{`
                            #reader video {
                                object-fit: cover !important;
                                width: 100% !important;
                                height: 100% !important;
                            }
                        `}</style>

                        {/* The Camera View - Full Height */}
                        <div id="reader" className="w-full h-full bg-black"></div>

                        {/* Dark Overlay with Transparent Center Rect (Premium UI) */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                            {/* Top Dark */}
                            <div className="absolute top-0 left-0 right-0 h-[25%] bg-black/50 backdrop-blur-[2px]"></div>
                            {/* Bottom Dark */}
                            <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-black/50 backdrop-blur-[2px]"></div>
                            {/* Left Dark */}
                            <div className="absolute top-[25%] bottom-[35%] left-0 w-[10%] bg-black/50 backdrop-blur-[2px]"></div>
                            {/* Right Dark */}
                            <div className="absolute top-[25%] bottom-[35%] right-0 w-[10%] bg-black/50 backdrop-blur-[2px]"></div>

                            {/* Center Scan Area Frame */}
                            <div className="absolute top-[25%] bottom-[35%] left-[10%] right-[10%] border-2 border-white/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.1)]">
                                {/* Corner Markers */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-xl"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-xl"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-xl"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-xl"></div>

                                {/* Laser Line */}
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_15px_3px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            </div>
                        </div>

                        {/* Instructions Overlay */}
                        <div className="absolute bottom-10 left-0 right-0 text-center text-white z-30 pointer-events-none">
                            <span className="text-sm bg-black/60 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 font-bold text-emerald-400 shadow-xl">
                                الماسح الذكي V2 🚀
                            </span>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-sm mx-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl text-center relative z-30"
                    >
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{scannedData?.name}</h3>
                        <p className="text-slate-500 text-sm mb-2">{scannedData?.barcode}</p>
                        {scannedData?.exists && scannedData?.quantity && (
                            <p className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-500/10 inline-block px-3 py-1 rounded-full text-sm mb-4">
                                الكمية المخزنة: {scannedData.quantity}
                            </p>
                        )}
                        <img src={scannedData?.image} alt="Product" className="w-full h-48 object-cover rounded-2xl mb-6 shadow-md bg-white" />

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={resetScan} className="py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                <RotateCcw className="w-4 h-4" />
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
                                className="py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                            >
                                إضافة للمخزون
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
