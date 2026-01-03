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

    // "Mall Style" Soft Beep (Standard Supermarket Checkout)
    // Pure Sine wave, comfortable mid-range pitch, very short

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine'; // Pure tone, no buzz (softest possible sound)
    osc.frequency.setValueAtTime(750, ctx.currentTime); // 750Hz - The "Standard" pleasant beep

    // Envelope for a "plock" or short beep sound
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01); // Quick soft entry, Max Volume (1.0)
    gain.gain.setValueAtTime(1.0, ctx.currentTime + 0.05); // Sustain at Max
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); // Smooth release

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
}
