import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function playScanSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Modern "Toot/Ding" (Sine wave with pitch slide)
    osc.type = 'sine'; // Clean & Modern

    // Pitch Slide (Low to High = Happy/Success)
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);

    // Smooth Envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.02); // Soft attack
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); // Smooth release

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}
