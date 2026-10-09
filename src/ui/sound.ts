/**
 * Dźwięki 8-bit syntezowane w przeglądarce (Web Audio, bez plików): krótkie efekty z fal prostokątnych,
 * trójkątnych i szumu. Wyłącznik zapamiętany na urządzeniu (localStorage — to ustawienie widza, nie stan gry).
 * iOS pozwala grać dopiero po geście użytkownika — kontekst budzimy przy pierwszym dotknięciu.
 */

export type Sfx =
  | 'tap' | 'coin' | 'buy' | 'eat' | 'pet' | 'meow' | 'purr' | 'blow' | 'catch' | 'bad'
  | 'win' | 'lose' | 'jump' | 'water' | 'whoosh' | 'pop' | 'cook' | 'sparkle';

const KEY = 'gabigochi.sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readEnabled();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* bez pamięci — ustawienie tylko do końca sesji */
  }
  if (on) play('tap');
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Budzi kontekst przy pierwszym geście (wymóg iOS). */
export function unlockAudio(): void {
  const once = () => {
    audio();
    window.removeEventListener('pointerdown', once);
  };
  window.addEventListener('pointerdown', once);
}

/** Jeden ton: fala, częstotliwość (z poślizgiem do `to`), czas, głośność, opóźnienie. */
function tone(type: OscillatorType, from: number, to: number, dur: number, vol = 1, delay = 0): void {
  const a = audio();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Krótki szum (dmuchnięcie, plusk, skwierczenie). */
function noise(dur: number, vol = 0.6, delay = 0, highpass = 800): void {
  const a = audio();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = highpass;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

/** Melodyjka z nut (Hz) co `step` s. */
function arp(type: OscillatorType, notes: number[], step: number, vol = 0.8): void {
  notes.forEach((n, i) => tone(type, n, n, step * 1.4, vol, i * step));
}

const C5 = 523, E5 = 659, G5 = 784, C6 = 1047, A4 = 440, F4 = 349, D5 = 587;

/** Szarpnięta struna (ukulele w minigrze): miękki trójkąt z krótkim „brzdękiem” oktawę wyżej. */
export function pluck(freq: number): void {
  if (!enabled) return;
  tone('triangle', freq, freq, 0.45, 0.9);
  tone('square', freq * 2, freq * 2, 0.06, 0.18);
}

export function play(s: Sfx): void {
  if (!enabled) return;
  switch (s) {
    case 'tap':
      return tone('square', 880, 880, 0.04, 0.4);
    case 'pop':
      return tone('square', 600, 1200, 0.06, 0.5);
    case 'coin':
      return arp('square', [988, 1319], 0.07, 0.6);
    case 'buy':
      return arp('square', [C5, E5, G5, C6], 0.06, 0.6);
    case 'eat':
      tone('square', 300, 200, 0.07, 0.6);
      return tone('square', 320, 220, 0.07, 0.6, 0.12);
    case 'pet':
      return arp('triangle', [E5, G5, C6], 0.07, 0.8);
    case 'meow':
      tone('triangle', 700, 1100, 0.12, 0.7);
      return tone('triangle', 1100, 500, 0.22, 0.7, 0.12);
    case 'purr':
      for (let i = 0; i < 6; i++) tone('sawtooth', 60, 55, 0.09, 0.35, i * 0.1);
      return;
    case 'blow':
      return noise(0.25, 0.5, 0, 1500);
    case 'catch':
      return tone('square', 700, 1400, 0.08, 0.5);
    case 'bad':
      return tone('square', 220, 110, 0.25, 0.6);
    case 'win':
      return arp('square', [C5, E5, G5, C6, G5, C6], 0.09, 0.7);
    case 'lose':
      return arp('triangle', [G5, F4 * 2, D5, A4], 0.14, 0.7);
    case 'jump':
      return tone('square', 400, 900, 0.12, 0.5);
    case 'water':
      noise(0.3, 0.35, 0, 2500);
      return tone('sine', 900, 400, 0.15, 0.4, 0.05);
    case 'whoosh':
      return noise(0.18, 0.3, 0, 600);
    case 'cook':
      noise(0.6, 0.25, 0, 3000);
      return tone('triangle', 200, 180, 0.2, 0.3);
    case 'sparkle':
      return arp('triangle', [C6, 1319, 1568, 2093], 0.05, 0.5);
  }
}
