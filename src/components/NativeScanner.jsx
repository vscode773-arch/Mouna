import React, { useEffect, useState } from 'react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { X, Zap, ZapOff } from 'lucide-react';
import { playScanSound } from '../lib/utils'; // Re-use sound function

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
                    onClose(); // Close if denied
                }
            } catch (err) {
                console.error("Native scanner error:", err);
                // Fallback or close could happen here
                onClose();
            }
        };
        checkPermission();

        // Cleanup: Stop scan when component unmounts
        return () => {
            stopScan();
        };
    }, []);

    const startScan = async () => {
        // Make webview transparent so we can see the camera behind it
        await BarcodeScanner.hideBackground();
        document.body.style.backgroundColor = "transparent";
        document.documentElement.style.backgroundColor = "transparent";

        // AGGRESSIVE FIX: Force root layout transparency
        const rootDiv = document.getElementById('root');
        if (rootDiv) {
            rootDiv.style.backgroundColor = "transparent";
            // Make immediate children transparent too (Layout wrapper)
            Array.from(rootDiv.children).forEach(child => {
                if (child instanceof HTMLElement) child.style.backgroundColor = "transparent";
            });
        }

        // Add class for global CSS support
        document.body.classList.add("scanner-active");

        BarcodeScanner.startScan().then((result) => {
            // Result contains content
            if (result.hasContent) {
                playScanSound();
                onScan(result.content); // Return data
                stopScan(); // Stop after one scan (optional, or keep scanning)
            }
        }).catch(err => console.error(err));
    };

    const stopScan = () => {
        BarcodeScanner.showBackground();
        BarcodeScanner.stopScan();
        document.body.style.backgroundColor = ""; // Reset
        document.documentElement.style.backgroundColor = "";

        // Restore root layout
        const rootDiv = document.getElementById('root');
        if (rootDiv) {
            rootDiv.style.backgroundColor = "";
            Array.from(rootDiv.children).forEach(child => {
                if (child instanceof HTMLElement) child.style.backgroundColor = "";
            });
        }

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

    if (!hasPermission) return <div className="fixed inset-0 bg-black z-50"></div>;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-transparent">
            {/* 
        This div is transparent, sitting ON TOP of the native camera.
        We draw our UI here.
      */}

            {/* Header */}
            <div className="flex justify-between items-center p-4 pt-10">
                <button
                    onClick={() => { stopScan(); onClose(); }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white"
                >
                    <X className="w-6 h-6" />
                </button>

                <button
                    onClick={toggleFlash}
                    className={`p-3 rounded-full backdrop-blur-md transition-colors ${flashActive ? 'bg-yellow-400/80 text-black' : 'bg-black/40 text-white'}`}
                >
                    {flashActive ? <ZapOff className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                </button>
            </div>

            {/* Center Frame UI (The same design we loved) */}
            <div className="flex-1 flex items-center justify-center relative pointer-events-none">
                {/* Scan Box */}
                <div className="w-[75%] aspect-square max-w-sm relative">
                    {/* 
                   For native camera, we don't need "dark overlays" to mask the video, 
                   because the WHOLE screen is the video.
                   But we can add a subtle semi-transparent border to focus attention.
                */}

                    {/* Visual Corners */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-[6px] border-l-[6px] border-emerald-500 rounded-tl-3xl -mt-1 -ml-1 shadow-sm"></div>
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-[6px] border-r-[6px] border-emerald-500 rounded-tr-3xl -mt-1 -mr-1 shadow-sm"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[6px] border-l-[6px] border-emerald-500 rounded-bl-3xl -mb-1 -ml-1 shadow-sm"></div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[6px] border-r-[6px] border-emerald-500 rounded-br-3xl -mb-1 -mr-1 shadow-sm"></div>

                    {/* Laser Line */}
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,1)] animate-pulse"></div>
                </div>

                <div className="absolute bottom-20 left-0 right-0 text-center">
                    <span className="inline-block px-6 py-2 bg-black/50 backdrop-blur-md rounded-full text-white/90 text-sm font-bold border border-white/10">
                        Native Scanner ⚡
                    </span>
                </div>
            </div>
        </div>
    );
};

export default NativeScanner;
