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

    // Industrial Scanner Sound (Zebra/Symbol Style)
    // Square wave is the loudest and punchiest, typical for scanners
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, ctx.currentTime); // High pitch (2.2kHz)

    // Aggressive Envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01); // Instant loud
    gain.gain.setValueAtTime(1.0, ctx.currentTime + 0.08); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); // Fast cutoff

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}
