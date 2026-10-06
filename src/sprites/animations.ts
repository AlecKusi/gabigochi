import manifest from './animations.json';

export type OverlayName = 'zzz' | 'cloud' | 'food';

/** Wpis manifestu: albo `frames`, albo `fallback` (istniejąca klatka + nakładka). */
export interface AnimDef {
  frames?: string[];
  fps?: number;
  fallback?: string;
  overlay?: string;
  dim?: boolean;
  flipForRight?: boolean;
}

export interface ResolvedAnim {
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
    return { frames: def.frames, fps: def.fps ?? 6, overlay, dim: def.dim ?? false, flipForRight: def.flipForRight ?? false };
  }
  if (def.fallback) {
    return { frames: [def.fallback], fps: 1, overlay, dim: def.dim ?? false, flipForRight: false };
  }
  throw new Error(`Animacja "${name}" nie ma klatek ani zastępstwa`);
}

export function frameAt(anim: ResolvedAnim, elapsedMs: number): string {
  const index = Math.floor((elapsedMs / 1000) * anim.fps) % anim.frames.length;
  return anim.frames[index];
}

export function allFrameNames(m: Record<string, AnimDef>): string[] {
  const names = new Set<string>();
  for (const def of Object.values(m)) {
    def.frames?.forEach((f) => names.add(f));
    if (def.fallback) names.add(def.fallback);
  }
  return [...names];
}
