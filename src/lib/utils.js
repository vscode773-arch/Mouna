import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function playScanSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    // Try to resume if suspended (common on mobile)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Industrial Scanner Sound (Zebra/Symbol Style)
    osc.type = 'square'; // Square wave is the loudest and punchiest
    osc.frequency.setValueAtTime(2200, ctx.currentTime); // High pitch (2.2kHz) cuts through noise

    // Aggressive Envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01); // Immediate max volume
    gain.gain.setValueAtTime(1.0, ctx.currentTime + 0.08); // Sustain at max
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); // Fast cutoff

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}
