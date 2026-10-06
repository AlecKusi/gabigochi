import { content } from '../content';
import { needStatus } from '../core/needs';
import type { Needs } from '../core/types';

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie. */
export function pickLine(needs: Needs, rng: () => number = Math.random): string {
  const st = needStatus(needs);
  const pool = st.hungry
    ? content.lines.hungry
    : st.sleepy
      ? content.lines.sleepy
      : st.bored
        ? content.lines.bored
        : content.lines.happy;
  return pick(pool, rng);
}
