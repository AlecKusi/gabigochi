export const CONFIG = {
  needs: {
    max: 100,
    awakeDecayPerHour: { hunger: 6, mood: 4, energy: 5 },
    sleepDecayPerHour: { hunger: 3, mood: 2 },
    sleepEnergyGainPerHour: 15,
    moodHappyAbove: 60,
    moodSadBelow: 30,
    hungryBelow: 25,
    sleepyBelow: 20,
    boredBelow: 25,
  },
  startNeeds: { hunger: 80, mood: 90, energy: 90 },
  coins: { start: 150, dailyBonus: 20 },
  pet: { moodGain: 2, cooldownMs: 30_000 },
  games: { energyCost: 5, tiredBelow: 10 },
} as const;

export type FoodId = 'apple' | 'sandwich' | 'kitkat' | 'pizza' | 'cake';

export interface FoodDef {
  id: FoodId;
  name: string;
  price: number;
  hunger: number;
  mood: number;
}

export const FOODS: readonly FoodDef[] = [
  { id: 'apple', name: 'Jabłko', price: 5, hunger: 10, mood: 0 },
  { id: 'sandwich', name: 'Kanapka', price: 10, hunger: 20, mood: 0 },
  { id: 'kitkat', name: 'KitKat', price: 15, hunger: 15, mood: 25 },
  { id: 'pizza', name: 'Pizza', price: 20, hunger: 35, mood: 5 },
  { id: 'cake', name: 'Tort urodzinowy', price: 40, hunger: 30, mood: 20 },
];

export function foodById(id: FoodId): FoodDef {
  const food = FOODS.find((f) => f.id === id);
  if (!food) throw new Error(`Nieznane jedzenie: ${id}`);
  return food;
}
