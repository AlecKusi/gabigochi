export const CONFIG = {
  needs: {
    max: 100,
    awakeDecayPerHour: { hunger: 6, mood: 4, energy: 5 },
    sleepDecayPerHour: { hunger: 3, mood: 2 },
    /** Sen i drzemka: od zera do pełnej energii w 10 minut. */
    sleepEnergyGainPerHour: 600,
    moodHappyAbove: 60,
    moodSadBelow: 30,
    hungryBelow: 25,
    sleepyBelow: 20,
    boredBelow: 25,
  },
  startNeeds: { hunger: 80, mood: 90, energy: 90 },
  coins: { start: 150, dailyBonus: 20, birthdayGift: 1000 },
  pet: { moodGain: 2, cooldownMs: 30_000 },
  games: { energyCost: 5, tiredBelow: 10 },
  /** Kotek: spadek najedzenia i sympatii na godzinę, ile daje karmienie i głaskanie. */
  cat: { defaultName: 'Kotek', hungerPerHour: 8, lovePerHour: 4, feedLove: 10, petLove: 20, hungryBelow: 35, maxName: 14 },
} as const;

export type FoodId =
  | 'apple' | 'sandwich' | 'kitkat' | 'pizza' | 'cake' | 'cola'
  | 'strawberry' | 'donut' | 'icecream' | 'zapiekanka' | 'pancakes' | 'pierogi' | 'ramen' | 'sushi';

export interface FoodDef {
  id: FoodId;
  name: string;
  price: number;
  hunger: number;
  mood: number;
}

/** Kolejność w sklepie: od przekąsek po obiady, na końcu tort i napój. */
export const FOODS: readonly FoodDef[] = [
  { id: 'apple', name: 'Jabłko', price: 5, hunger: 10, mood: 0 },
  { id: 'strawberry', name: 'Truskawki', price: 6, hunger: 8, mood: 5 },
  { id: 'donut', name: 'Pączek', price: 9, hunger: 12, mood: 10 },
  { id: 'sandwich', name: 'Kanapka', price: 10, hunger: 20, mood: 0 },
  { id: 'icecream', name: 'Lody', price: 12, hunger: 6, mood: 18 },
  { id: 'kitkat', name: 'KitKat', price: 15, hunger: 15, mood: 25 },
  { id: 'zapiekanka', name: 'Zapiekanka', price: 15, hunger: 28, mood: 3 },
  { id: 'pancakes', name: 'Naleśniki', price: 16, hunger: 25, mood: 8 },
  { id: 'pierogi', name: 'Pierogi', price: 18, hunger: 32, mood: 6 },
  { id: 'pizza', name: 'Pizza', price: 20, hunger: 35, mood: 5 },
  { id: 'ramen', name: 'Ramen', price: 24, hunger: 38, mood: 8 },
  { id: 'sushi', name: 'Sushi', price: 28, hunger: 30, mood: 14 },
  { id: 'cake', name: 'Tort urodzinowy', price: 40, hunger: 30, mood: 20 },
  // napój: Gabi pije z puszki (animacja picia zamiast jedzenia)
  { id: 'cola', name: 'Cola', price: 8, hunger: 5, mood: 15 },
];

export function foodById(id: FoodId): FoodDef {
  const food = FOODS.find((f) => f.id === id);
  if (!food) throw new Error(`Nieznane jedzenie: ${id}`);
  return food;
}
