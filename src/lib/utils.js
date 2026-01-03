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

    // "Toot" Sound (Classic Cash Register Beep)
    // Deeper tone, resembling older NCR or Motorola scanners

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle'; // Smoother tone, less "digital/buzzy"
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note - classic "beep" pitch

    // Envelope for "Toot" sound (softer attack, firm body)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.02); // Quick but soft entry
    gain.gain.setValueAtTime(1.0, ctx.currentTime + 0.1); // Sustain
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); // Quick release

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
}
