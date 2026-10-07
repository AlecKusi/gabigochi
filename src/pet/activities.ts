export type ActivityId = 'study' | 'nursing' | 'phone' | 'crochet' | 'music';

export interface ActivityDef {
  id: ActivityId;
  name: string;
  kind: 'story' | 'loop';
  /** Historyjka: sceny po kolei. Pętla: klatki pętli. */
  frames: string[];
  sceneMs?: number;
  intro?: string[];
  introMs?: number;
  fps?: number;
  outro?: string;
  outroMs?: number;
  /** Klatki rysowane na środku pokoju (sceny z rekwizytami). */
  centered: string[];
  /**
   * Zbliżenia (kadry z uciętym biurkiem/łóżkiem — tak narysowane): pokazywane w okienku nad Gabi, a sama Gabi
   * zostaje w ostatniej pełnej scenie przed zbliżeniem (`zoomBase`).
   */
  zoom?: string[];
  avatar?: string;
  lines: string[];
}

export const CROSSFADE_MS = 400;
export const ACTIVITY_MOOD_BONUS = 3;

export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  study: {
    id: 'study', name: 'Nauka', kind: 'story', sceneMs: 4500,
    frames: ['study_1', 'study_2', 'study_3', 'study_4', 'study_5'],
    centered: ['study_1'],
    zoom: ['study_2', 'study_3', 'study_4', 'study_5'],
    avatar: 'face_study',
    lines: ['Jeszcze jeden rozdział…', 'Kolokwium z anatomii!', 'Muszę to zapamiętać.'],
  },
  nursing: {
    id: 'nursing', name: 'Praktyka', kind: 'story', sceneMs: 4500,
    frames: ['nurse_1', 'nurse_2', 'nurse_3', 'nurse_4', 'nurse_5'],
    centered: ['nurse_4'],
    zoom: ['nurse_3'],
    avatar: 'face_study',
    lines: ['Siostra Gabi na dyżurze!', 'Proszę się nie ruszać…', 'Wszystko będzie dobrze.'],
  },
  phone: {
    id: 'phone', name: 'Telefon', kind: 'loop', fps: 1.5,
    frames: ['phone_1', 'phone_2', 'phone_3', 'phone_4', 'phone_3', 'phone_2'],
    centered: [], avatar: 'face_phone',
    lines: ['Jeszcze jeden level!', 'Ale gra!', 'Hihi, memy.'],
  },
  crochet: {
    id: 'crochet', name: 'Szydełko', kind: 'loop', fps: 1,
    frames: ['crochet_1', 'crochet_2', 'crochet_3', 'crochet_4'],
    outro: 'crochet_5', outroMs: 2000, centered: [],
    lines: ['Zaraz skończę ten rząd!', 'Oczko, oczko…', 'Sweterek dla kotka!'],
  },
  music: {
    id: 'music', name: 'Muzyka', kind: 'loop', fps: 2,
    intro: ['music_1', 'music_2'], introMs: 800,
    frames: ['music_3', 'music_4'],
    outro: 'music_5', outroMs: 1500, centered: [],
    lines: ['Ale kawałek!', 'La la laaa!', 'Tańczymy!'],
  },
};

export const ACTIVITY_IDS = Object.keys(ACTIVITIES) as ActivityId[];

export interface ActivityFrame {
  frame: string;
  /** Poprzednia scena w trakcie przenikania (tylko historyjki), inaczej null. */
  prev: string | null;
  /** Udział bieżącej klatki 0–1. */
  blend: number;
}

export function activityFrame(def: ActivityDef, elapsedMs: number, totalMs: number): ActivityFrame {
  const t = Math.max(0, elapsedMs);
  if (def.kind === 'story') {
    const sceneMs = def.sceneMs ?? 4500;
    const i = Math.min(def.frames.length - 1, Math.floor(t / sceneMs));
    const inScene = t - i * sceneMs;
    if (i > 0 && inScene < CROSSFADE_MS) {
      return { frame: def.frames[i], prev: def.frames[i - 1], blend: inScene / CROSSFADE_MS };
    }
    return { frame: def.frames[i], prev: null, blend: 1 };
  }
  if (def.outro && t >= totalMs - (def.outroMs ?? 0)) return { frame: def.outro, prev: null, blend: 1 };
  const intro = def.intro ?? [];
  const introMs = def.introMs ?? 0;
  if (t < intro.length * introMs) return { frame: intro[Math.floor(t / introMs)], prev: null, blend: 1 };
  const loopT = t - intro.length * introMs;
  const n = def.frames.length;
  const idx = Math.floor((loopT / 1000) * (def.fps ?? 1)) % n;
  return { frame: def.frames[idx], prev: null, blend: 1 };
}

export function isZoom(def: ActivityDef, frame: string): boolean {
  return def.zoom?.includes(frame) ?? false;
}

/** Klatka postaci w czasie zbliżenia: ostatnia pełna scena przed nim (albo sama klatka, gdy to nie zbliżenie). */
export function zoomBase(def: ActivityDef, frame: string): string {
  if (!isZoom(def, frame)) return frame;
  const i = def.frames.indexOf(frame);
  for (let j = i - 1; j >= 0; j--) if (!isZoom(def, def.frames[j])) return def.frames[j];
  return def.frames.find((f) => !isZoom(def, f)) ?? frame;
}

export function activityDuration(def: ActivityDef, rng: () => number): number {
  if (def.kind === 'story') return def.frames.length * (def.sceneMs ?? 4500);
  return Math.round(20_000 + Math.min(1, Math.max(0, rng())) * 10_000);
}

export function pickActivity(rng: () => number): ActivityId {
  return ACTIVITY_IDS[Math.min(ACTIVITY_IDS.length - 1, Math.floor(rng() * ACTIVITY_IDS.length))];
}

export function nextActivityDelay(rng: () => number): number {
  return Math.round(60_000 + rng() * 60_000);
}

export function allActivityFrames(): string[] {
  const s = new Set<string>();
  for (const d of Object.values(ACTIVITIES)) {
    d.frames.forEach((f) => s.add(f));
    d.intro?.forEach((f) => s.add(f));
    if (d.outro) s.add(d.outro);
  }
  return [...s];
}
