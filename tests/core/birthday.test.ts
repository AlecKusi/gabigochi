import { describe, expect, it } from 'vitest';
import { ageOn, claimBirthdayGift, isBirthday, withAge } from '../../src/core/birthday';
import { CONFIG } from '../../src/core/config';
import { createState } from '../../src/core/state';
import { loadState } from '../../src/core/save';
import { content } from '../../src/content';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('urodziny Gabi (12 października)', () => {
  it('dzień urodzin i wiek', () => {
    expect(content.birthday).toMatchObject({ day: 12, month: 10 });
    expect(isBirthday(at(2026, 10, 12, 0))).toBe(true);
    expect(isBirthday(at(2026, 10, 12, 23))).toBe(true);
    expect(isBirthday(at(2026, 10, 11, 23))).toBe(false);
    expect(isBirthday(at(2026, 10, 13))).toBe(false);
    expect(ageOn(at(2026, 10, 12))).toBe(content.age);
    expect(ageOn(at(2027, 10, 12))).toBe(content.age + 1);
    expect(withAge('{wiek} lat!', at(2026, 10, 12))).toBe('26 lat!');
  });

  it('prezent: 1000 monet raz w roku, tylko w dniu urodzin', () => {
    const s = createState(at(2026, 10, 1));
    expect(claimBirthdayGift(s, at(2026, 10, 11)).granted).toBe(false);
    const r = claimBirthdayGift(s, at(2026, 10, 12, 9));
    expect(r.granted).toBe(true);
    expect(CONFIG.coins.birthdayGift).toBe(1000);
    expect(r.state.coins).toBe(s.coins + 1000);
    expect(claimBirthdayGift(r.state, at(2026, 10, 12, 20)).granted).toBe(false);
    expect(claimBirthdayGift(r.state, at(2027, 10, 12)).granted).toBe(true);
  });

  it('rok prezentu przetrwa zapis i odczyt; stary zapis bez tego pola wczytuje się bez naprawy', () => {
    const s = claimBirthdayGift(createState(at(2026, 10, 1)), at(2026, 10, 12)).state;
    const kv = (raw: string) => ({ getItem: () => raw, setItem: () => {} });
    expect(loadState(kv(JSON.stringify(s)), at(2026, 10, 12, 13)).state.lastBirthdayGift).toBe(2026);
    const old = createState(at(2026, 10, 1));
    const r = loadState(kv(JSON.stringify(old)), at(2026, 10, 12));
    expect(r).toMatchObject({ fresh: false, repaired: false });
    expect(claimBirthdayGift(r.state, at(2026, 10, 12)).granted).toBe(true);
  });
});
