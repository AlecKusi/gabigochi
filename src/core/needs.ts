import { CONFIG } from './config';
import { HOUR } from './time';
import type { GameState, MoodLevel, Needs } from './types';

const clamp = (v: number) => Math.max(0, Math.min(CONFIG.needs.max, v));

/** Przelicza potrzeby za czas od ostatniej aktualizacji (także gdy aplikacja była zamknięta). */
export function applyElapsed(state: GameState, now: number): GameState {
  const dtMs = now - state.lastUpdate;
  if (dtMs <= 0) return state;
  const n = CONFIG.needs;
  let hours = dtMs / HOUR;
  let { hunger, mood, energy } = state.needs;
  let sleeping = state.sleeping;

  if (sleeping) {
    const toFull = Math.max(0, (n.max - energy) / n.sleepEnergyGainPerHour);
    const sleepHours = Math.min(hours, toFull);
    energy += sleepHours * n.sleepEnergyGainPerHour;
    hunger -= sleepHours * n.sleepDecayPerHour.hunger;
    mood -= sleepHours * n.sleepDecayPerHour.mood;
    hours -= sleepHours;
    if (toFull <= dtMs / HOUR) {
      energy = n.max;
      sleeping = false;
    }
  }

  if (!sleeping && hours > 0) {
    hunger -= hours * n.awakeDecayPerHour.hunger;
    mood -= hours * n.awakeDecayPerHour.mood;
    energy -= hours * n.awakeDecayPerHour.energy;
  }

  // kotek głodnieje i tęskni także, gdy aplikacja jest zamknięta
  const allHours = dtMs / HOUR;
  const cat = state.cat
    ? {
        ...state.cat,
        hunger: clamp(state.cat.hunger - allHours * CONFIG.cat.hungerPerHour),
        love: clamp(state.cat.love - allHours * CONFIG.cat.lovePerHour),
      }
    : state.cat;

  return {
    ...state,
    lastUpdate: now,
    sleeping,
    needs: { hunger: clamp(hunger), mood: clamp(mood), energy: clamp(energy) },
    cat,
  };
}

export function moodLevel(needs: Needs): MoodLevel {
  const lowest = Math.min(needs.hunger, needs.mood, needs.energy);
  if (lowest > CONFIG.needs.moodHappyAbove) return 'happy';
  if (lowest < CONFIG.needs.moodSadBelow) return 'sad';
  return 'ok';
}

export function needStatus(needs: Needs): { hungry: boolean; bored: boolean; sleepy: boolean } {
  return {
    hungry: needs.hunger < CONFIG.needs.hungryBelow,
    bored: needs.mood < CONFIG.needs.boredBelow,
    sleepy: needs.energy < CONFIG.needs.sleepyBelow,
  };
}
