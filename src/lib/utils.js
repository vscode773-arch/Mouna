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

    // Datalogic Scanner Sound Simulation
    // Square wave gives that distinct "electronic" scanner beep character
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, ctx.currentTime); // High pitch (approx C#7) typical of Datalogic

    // Sharp envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01); // Fast attack, not too loud to distort
    gain.gain.setValueAtTime(0.5, ctx.currentTime + 0.05); // Short sustain
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); // Quick decay

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}
