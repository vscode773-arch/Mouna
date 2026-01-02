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

    // Standard Supermarket Beep (Sine Wave - Clean Tone)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6) is the standard "System Beep" pitch

    // Clean Envelope (No harsh start/stop)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.01); // Fast attack
    gain.gain.setValueAtTime(1, ctx.currentTime + 0.08); // Sustain
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12); // Fast release

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}
