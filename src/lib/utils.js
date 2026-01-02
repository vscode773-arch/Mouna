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

    // Triangle wave sounds louder than sine on small speakers (phones) but smoother than square
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6) is the standard "System Beep" pitch

    // Maximize volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01); // Instant max volume
    gain.gain.setValueAtTime(1.0, ctx.currentTime + 0.08); // Sustain at max
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); // Release

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}
