import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, X, Zap, Image as ImageIcon, RotateCcw, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { playScanSound } from '../lib/utils';

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

                const config = {
                    fps: 30,
                    qrbox: { width: 320, height: 180 }, // Wider box for barcodes
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                };

                html5QrCode.start(
                    { facingMode: "environment" },
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
        // Here you would typically fetch product details
        // For now, let's mock the fetch or use the OpenFoodFacts API like used elsewhere
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();

            if (data.status === 1) {
                setScannedData({
                    barcode: barcode,
                    name: data.product.product_name_ar || data.product.product_name || 'منتج غير معروف',
                    image: data.product.image_url || 'https://via.placeholder.com/300',
                    exists: true
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
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex gap-4">
                    {/* Additional controls can be re-enabled if library supports torch */}
                </div>
            </div>

            {/* Main Scanner Area */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                {isScanning ? (
                    <div className="w-full h-full relative">
                        <div id="reader" className="w-full h-full"></div>
                        {/* Overlay Styling */}
                        <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500 rounded-lg box-border opacity-70"></div>
                        </div>
                        <div className="absolute bottom-10 left-0 right-0 text-center text-white z-30">
                            <p className="bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">وجه الكاميرا نحو الباركود</p>
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
                        <p className="text-slate-500 text-sm mb-6">{scannedData?.barcode}</p>

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
