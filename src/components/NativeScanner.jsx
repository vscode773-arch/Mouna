import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { X, Zap, ZapOff } from 'lucide-react';
import { playScanSound } from '../lib/utils';

const NativeScanner = ({ onScan, onClose }) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [flashActive, setFlashActive] = useState(false);

    useEffect(() => {
        // 1. Check & Request Permission
        const checkPermission = async () => {
            try {
                const status = await BarcodeScanner.checkPermission({ force: true });
                if (status.granted) {
                    setHasPermission(true);
                    startScan();
                } else {
                    console.error("Camera permission denied");
                    onClose();
                }
            } catch (err) {
                console.error("Native scanner error:", err);
                onClose();
            }
        };

        // HIDE THE APP UI COMPLETELY
        const rootApp = document.getElementById('root');
        if (rootApp) {
            rootApp.style.display = 'none'; // Poof! Application gone.
        }

        // Ensure body is transparent
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';

        checkPermission();

        // Cleanup: Stop scan & Restore App UI
        return () => {
            stopScan();
            if (rootApp) {
                rootApp.style.display = ''; // Restore app
            }
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    const startScan = async () => {
        await BarcodeScanner.hideBackground();
        document.body.classList.add("scanner-active");
        BarcodeScanner.startScan().then((result) => {
            if (result.hasContent) {
                playScanSound();
                onScan(result.content);
                // The cleanup function in useEffect will handle stopping scan/restoring UI
            }
        }).catch(err => console.error(err));
    };

    const stopScan = () => {
        BarcodeScanner.showBackground();
        BarcodeScanner.stopScan();
        document.body.classList.remove("scanner-active");
    };

    const toggleFlash = () => {
        if (flashActive) {
            BarcodeScanner.disableTorch();
            setFlashActive(false);
        } else {
            BarcodeScanner.enableTorch();
            setFlashActive(true);
        }
    };

    if (!hasPermission) return null;

    // USE PORTAL: Render this UI outside the main App tree, directly into body
    // This allows it to stay visible even when we hide #root
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-transparent font-sans">
            {/* Header */}
            <div className="flex justify-between items-center p-4 pt-12 md:pt-4">
                <button
                    onClick={() => { onClose(); }} // Parent will unmount us, triggering cleanup
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 transition-colors"
                >
                    <X className="w-8 h-8" />
                </button>

                <button
                    onClick={toggleFlash}
                    className={`p-3 rounded-full backdrop-blur-md transition-colors ${flashActive ? 'bg-yellow-400/80 text-black' : 'bg-black/40 text-white'}`}
                >
                    {flashActive ? <ZapOff className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
                </button>
            </div>

            {/* Center Frame UI */}
            <div className="flex-1 flex items-center justify-center relative pointer-events-none">
                <div className="w-[85%] aspect-square max-w-sm relative">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-[6px] border-l-[6px] border-emerald-500 rounded-tl-3xl -mt-1 -ml-1 shadow-sm"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-[6px] border-r-[6px] border-emerald-500 rounded-tr-3xl -mt-1 -mr-1 shadow-sm"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[6px] border-l-[6px] border-emerald-500 rounded-bl-3xl -mb-1 -ml-1 shadow-sm"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[6px] border-r-[6px] border-emerald-500 rounded-br-3xl -mb-1 -mr-1 shadow-sm"></div>

                    {/* Laser */}
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,1)] animate-pulse"></div>
                </div>

                <div className="absolute bottom-24 left-0 right-0 text-center">
                    <span className="inline-block px-6 py-2 bg-black/50 backdrop-blur-md rounded-full text-white/90 text-sm font-bold border border-white/10">
                        جاري المسح...
                    </span>
                </div>
            </div>
        </div>,
        document.body // Target container
    );
};

export default NativeScanner;
