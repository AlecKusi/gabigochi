import manifest from './animations.json';

export type OverlayName = 'zzz' | 'cloud' | 'food';

/** Wpis manifestu: albo `frames`, albo `fallback` (istniejąca klatka + nakładka). */
export interface AnimDef {
  intro?: string[];
  introFps?: number;
  frames?: string[];
  fps?: number;
  fallback?: string;
  overlay?: string;
  dim?: boolean;
  flipForRight?: boolean;
}

export interface ResolvedAnim {
  intro: string[];
  introFps: number;
  frames: string[];
  fps: number;
  overlay: OverlayName | null;
  dim: boolean;
  flipForRight: boolean;
}

export const ANIMATIONS: Record<string, AnimDef> = manifest;

export function resolveAnimation(m: Record<string, AnimDef>, name: string): ResolvedAnim {
  const def = m[name] ?? m.idle;
  const overlay = (def.overlay ?? null) as OverlayName | null;
  if (def.frames && def.frames.length > 0) {
    return { intro: def.intro ?? [], introFps: def.introFps ?? def.fps ?? 6, frames: def.frames, fps: def.fps ?? 6, overlay, dim: def.dim ?? false, flipForRight: def.flipForRight ?? false };
  }
  if (def.fallback) {
    return { intro: def.intro ?? [], introFps: def.introFps ?? 1, frames: [def.fallback], fps: 1, overlay, dim: def.dim ?? false, flipForRight: false };
  }
  throw new Error(`Animacja "${name}" nie ma klatek ani zastępstwa`);
}

export function frameAt(anim: ResolvedAnim, elapsedMs: number): string {
  const introMs = (anim.intro.length * 1000) / anim.introFps;
  if (anim.intro.length > 0 && elapsedMs >= 0 && elapsedMs < introMs) {
    return anim.intro[Math.floor((elapsedMs / 1000) * anim.introFps)];
  }
  const t = anim.intro.length > 0 ? elapsedMs - introMs : elapsedMs;
  const n = anim.frames.length;
  const index = ((Math.floor((t / 1000) * anim.fps) % n) + n) % n;
  return anim.frames[index];
}

export function allFrameNames(m: Record<string, AnimDef>): string[] {
  const names = new Set<string>();
  for (const def of Object.values(m)) {
    def.intro?.forEach((f) => names.add(f));
    def.frames?.forEach((f) => names.add(f));
    if (def.fallback) names.add(def.fallback);
  }
  return [...names];
}
