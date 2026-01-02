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

    // Matches the sound in the video: Sharp, high-pitch electronic beep
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, ctx.currentTime); // 2.4kHz gives that sharp "electronic" tone

    // Quick burst envelope
    gain.gain.setValueAtTime(0.8, ctx.currentTime); // Loud volume
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); // Quick release

    osc.start();
    osc.stop(ctx.currentTime + 0.12); // Short & punchy
}
