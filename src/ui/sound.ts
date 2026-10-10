/**
 * Dźwięki 8-bit syntezowane w przeglądarce (Web Audio, bez plików): krótkie efekty z fal prostokątnych,
 * trójkątnych i szumu. Wyłącznik zapamiętany na urządzeniu (localStorage — to ustawienie widza, nie stan gry).
 * iOS pozwala grać dopiero po geście użytkownika — kontekst budzimy przy pierwszym dotknięciu.
 */

export type Sfx =
  | 'tap' | 'coin' | 'buy' | 'eat' | 'pet' | 'meow' | 'purr' | 'blow' | 'catch' | 'bad'
  | 'win' | 'lose' | 'jump' | 'water' | 'whoosh' | 'pop' | 'cook' | 'sparkle'
  // Gabi w pokoju: lądowanie po upuszczeniu, mycie zębów, czesanie, pranie, kąpiel, kaczuszka, śpiew,
  // ekspres, lampka, spłukiwanie
  | 'land' | 'scrub' | 'swish' | 'cloth' | 'splash' | 'squeak' | 'sing' | 'brew' | 'click' | 'flush'
  // minigry: odbicie, rozbity klocek, karta, para, „nie”, tyknięcie, wpisanie cyfry, gumka, klawisz,
  // pełna linia, zapalona świeczka, kot wychyla się, pudło, nowy rekord
  | 'blip' | 'brick' | 'flip' | 'match' | 'nope' | 'tick' | 'place' | 'erase' | 'type'
  | 'line' | 'flick' | 'peek' | 'thud' | 'record';

/** Podłoga pod stopami Gabi: deski, płytki, dywan. */
export type StepSurface = 'wood' | 'tile' | 'soft';

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

/** Krótki szum (dmuchnięcie, plusk, skwierczenie); `filter` — górno-, dolno- albo pasmowoprzepustowy. */
function noise(dur: number, vol = 0.6, delay = 0, freq = 800, filter: BiquadFilterType = 'highpass'): void {
  const a = audio();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
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

const C5 = 523, E5 = 659, G5 = 784, C6 = 1047, A4 = 440, F4 = 349, D5 = 587, E6 = 1319, G6 = 1568;

/**
 * Najmniejszy odstęp (ms) między powtórzeniami efektu: dziesiątki kulek w cegiełkach albo szybkie stukanie
 * nie zlewają się w trzask.
 */
const MIN_GAP: Partial<Record<Sfx, number>> = { blip: 45, brick: 55, tick: 35, type: 30, flip: 40, peek: 120, place: 40 };
const lastAt = new Map<Sfx, number>();

function tooSoon(s: Sfx): boolean {
  const gap = MIN_GAP[s];
  if (gap === undefined) return false;
  const now = performance.now();
  if (now - (lastAt.get(s) ?? -Infinity) < gap) return true;
  lastAt.set(s, now);
  return false;
}

let stepSide = 0;

/** Krok Gabi: cichy, lewa i prawa stopa na zmianę trochę inaczej; brzmienie zależy od podłogi. */
export function step(surface: StepSurface): void {
  if (!enabled) return;
  stepSide ^= 1;
  const k = stepSide ? 1 : 0.92;
  if (surface === 'tile') {
    tone('square', 360 * k, 240 * k, 0.03, 0.1);
    return noise(0.03, 0.1, 0, 2600);
  }
  if (surface === 'soft') return noise(0.06, 0.16, 0, 500 * k, 'lowpass');
  tone('triangle', 150 * k, 95 * k, 0.07, 0.32);
  noise(0.03, 0.06, 0, 1400);
}

/** Szarpnięta struna (ukulele w minigrze): miękki trójkąt z krótkim „brzdękiem” oktawę wyżej. */
export function pluck(freq: number): void {
  if (!enabled) return;
  tone('triangle', freq, freq, 0.45, 0.9);
  tone('square', freq * 2, freq * 2, 0.06, 0.18);
}

export function play(s: Sfx): void {
  if (!enabled || tooSoon(s)) return;
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
    case 'land':
      tone('triangle', 190, 60, 0.13, 0.6);
      return noise(0.08, 0.25, 0, 300, 'lowpass');
    case 'scrub':
      noise(0.07, 0.22, 0, 3200, 'bandpass');
      return noise(0.07, 0.18, 0.09, 2600, 'bandpass');
    case 'swish':
      return noise(0.16, 0.22, 0, 1800, 'bandpass');
    case 'cloth':
      noise(0.12, 0.18, 0, 900, 'bandpass');
      return tone('triangle', 160, 110, 0.08, 0.25, 0.05);
    case 'splash':
      noise(0.35, 0.4, 0, 1400);
      return tone('sine', 700, 220, 0.2, 0.3);
    case 'squeak':
      tone('square', 1150, 1650, 0.08, 0.35);
      return tone('square', 1650, 1050, 0.11, 0.35, 0.08);
    case 'sing':
      return arp('triangle', [E5, G5, E5, C6], 0.17, 0.5);
    case 'brew':
      for (let i = 0; i < 6; i++) {
        const f = 170 + ((i * 53) % 110);
        tone('sine', f, f * 1.5, 0.06, 0.35, i * 0.09);
      }
      return noise(0.55, 0.1, 0, 3000);
    case 'click':
      tone('square', 1500, 1500, 0.015, 0.35);
      return tone('square', 900, 900, 0.015, 0.25, 0.05);
    case 'flush':
      noise(0.7, 0.35, 0, 700, 'lowpass');
      return tone('sine', 500, 150, 0.6, 0.25, 0.05);
    case 'blip':
      return tone('square', 660, 660, 0.03, 0.3);
    case 'brick':
      tone('square', 320, 900, 0.07, 0.4);
      return noise(0.1, 0.22, 0, 2000);
    case 'flip':
      noise(0.05, 0.22, 0, 2500);
      return tone('triangle', 500, 820, 0.05, 0.3);
    case 'match':
      return arp('square', [E5, G5, C6], 0.06, 0.5);
    case 'nope':
      tone('triangle', 330, 250, 0.1, 0.5);
      return tone('triangle', 250, 190, 0.12, 0.5, 0.11);
    case 'tick':
      return tone('square', 1200, 1200, 0.02, 0.16);
    case 'place':
      return tone('triangle', 700, 940, 0.06, 0.5);
    case 'erase':
      return noise(0.12, 0.25, 0, 1200, 'bandpass');
    case 'type':
      tone('square', 1800, 1800, 0.015, 0.22);
      return noise(0.02, 0.15, 0, 4000);
    case 'line':
      return arp('triangle', [C6, E6, G6], 0.06, 0.5);
    case 'flick':
      noise(0.08, 0.16, 0, 3000);
      return tone('triangle', 900, 1300, 0.06, 0.22);
    case 'peek':
      return tone('square', 300, 700, 0.07, 0.3);
    case 'thud':
      return tone('triangle', 150, 90, 0.08, 0.45);
    case 'record':
      arp('square', [C5, E5, G5, C6, E6], 0.08, 0.6);
      tone('triangle', C6, C6, 0.5, 0.45, 0.42);
      return tone('triangle', E6, E6, 0.5, 0.35, 0.42);
  }
}
