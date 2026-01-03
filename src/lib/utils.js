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

    // Datalogic Handheld Scanner Sound (Gryphon/QuickScan style)
    // Sharp, crisp square wave beep

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Square wave for that distinct "digital" beep
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, ctx.currentTime); // High pitch (approx C#7)

    // Very fast snappy envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005); // Instant attack
    gain.gain.setValueAtTime(0.5, ctx.currentTime + 0.05); // Short hold
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); // Quick release

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
}
