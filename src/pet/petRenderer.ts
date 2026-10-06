/** Cień pod postacią (px logiczne); przy skoku węższy, im wyżej (np. trzymana palcem), tym mniejszy. */
export function shadowRect(x: number, feetY: number, jump: number): { x: number; y: number; w: number; h: number } {
  const w = jump > 4 ? Math.max(8, 14 - Math.floor(jump / 12)) : 20;
  return { x: Math.round(x - w / 2), y: feetY - 1, w, h: 2 };
}

export const SHADOW_COLOR = 'rgba(42, 31, 61, 0.3)';
