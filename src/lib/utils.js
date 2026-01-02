import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function playScanSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Classic Supermarket "BEEP"
    osc.type = 'sine'; // Sine wave is cleaner, less "8-bit"
    osc.frequency.setValueAtTime(1600, ctx.currentTime); // ~1.6kHz is typical for scanners

    // Sharp attack and release (Mechanical feel)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.01); // Instant loud
    gain.gain.setValueAtTime(1, ctx.currentTime + 0.08); // Sustain briefly
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); // Quick cutoff

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}
