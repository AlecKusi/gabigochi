import { content } from '../content';
import { needStatus } from '../core/needs';
import type { Needs } from '../core/types';

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** Jak często (gdy niczego nie brakuje) Gabi rzuca losowym tekstem zamiast zwykłej kwestii. */
export const RANDOM_LINE_CHANCE = 0.35;

/** Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie (a przy zadowoleniu czasem losowy tekst). */
export function pickLine(needs: Needs, rng: () => number = Math.random): string {
  const st = needStatus(needs);
  if (st.hungry) return pick(content.lines.hungry, rng);
  if (st.sleepy) return pick(content.lines.sleepy, rng);
  if (st.bored) return pick(content.lines.bored, rng);
  return pick(rng() < RANDOM_LINE_CHANCE ? content.lines.random : content.lines.happy, rng);
}
