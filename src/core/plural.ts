/** Polska odmiana słowa „moneta” po liczebniku (w bierniku: „+1 monetę”, „+3 monety”, „+5 monet”). */
export function coinsLabel(n: number): string {
  if (n === 1) return 'monetę';
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'monety';
  return 'monet';
}
