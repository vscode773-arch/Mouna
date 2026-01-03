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

    // Datalogic Magellan Scanner Sound (Fixed Scanner)
    // Famous "Chirp" or double-tone sound
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.type = 'sawtooth'; // Slightly smoother but techy
    osc1.frequency.setValueAtTime(2000, ctx.currentTime);

    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);

    // Second tone (slightly higher, creates the chirp effect)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(2500, ctx.currentTime + 0.04); // Higher pitch, delayed

    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.04);
    gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc2.start(ctx.currentTime + 0.04);
    osc2.stop(ctx.currentTime + 0.15);
}
