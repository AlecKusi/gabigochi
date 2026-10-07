import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState, Outfit } from '../../src/core/types';
import { CLOTHES, clothesBySlot } from '../../src/wardrobe/catalog';
import {
  DEFAULT_OUTFIT,
  buyCloth,
  isDefaultOutfit,
  isOwned,
  outfitKey,
  takeOff,
  takeOffAll,
  wear,
} from '../../src/wardrobe/outfit';

const T0 = new Date(2026, 9, 7, 12).getTime();
const id = (slot: 'head' | 'top' | 'bottom' | 'dress', i = 0) => clothesBySlot(slot)[i].id;

/** Stan, w którym Gabi posiada wszystkie ubrania. */
function rich(): GameState {
  return { ...createState(T0), coins: 5000, ownedClothes: CLOTHES.map((c) => c.id) };
}

function ok(r: { ok: boolean; state?: GameState }): GameState {
  expect(r.ok).toBe(true);
  return (r as { ok: true; state: GameState }).state;
}

describe('DEFAULT_OUTFIT i stan startowy', () => {
  it('domyślny strój to same null', () => {
    expect(DEFAULT_OUTFIT).toEqual({ head: null, top: null, bottom: null, dress: null });
    expect(isDefaultOutfit(DEFAULT_OUTFIT)).toBe(true);
  });

  it('nowy stan: oryginalny strój, nic nie kupione', () => {
    const s = createState(T0);
    expect(s.outfit).toEqual(DEFAULT_OUTFIT);
    expect(s.ownedClothes).toEqual([]);
  });

  it('stan startowy nie dzieli obiektu stroju z DEFAULT_OUTFIT', () => {
    expect(createState(T0).outfit).not.toBe(DEFAULT_OUTFIT);
    expect(createState(T0).ownedClothes).not.toBe(createState(T0).ownedClothes);
  });
});

describe('buyCloth', () => {
  it('kupuje: zdejmuje monety, dopisuje do ownedClothes, nie zakłada', () => {
    const s = { ...createState(T0), coins: 1000 };
    const c = CLOTHES[0];
    const n = ok(buyCloth(s, c.id));
    expect(n.coins).toBe(1000 - c.price);
    expect(n.ownedClothes).toEqual([c.id]);
    expect(n.outfit).toEqual(DEFAULT_OUTFIT);
    expect(isOwned(n, c.id)).toBe(true);
    expect(isOwned(s, c.id)).toBe(false);
  });

  it('nie zmienia wejściowego stanu', () => {
    const s = { ...createState(T0), coins: 1000 };
    const snap = JSON.stringify(s);
    buyCloth(s, CLOTHES[0].id);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('kupione kolejno zachowują kolejność', () => {
    let s = { ...createState(T0), coins: 5000 };
    s = ok(buyCloth(s, CLOTHES[3].id));
    s = ok(buyCloth(s, CLOTHES[1].id));
    expect(s.ownedClothes).toEqual([CLOTHES[3].id, CLOTHES[1].id]);
  });

  it('za mało monet → no-coins, stan bez zmian', () => {
    const c = CLOTHES[0];
    const s = { ...createState(T0), coins: c.price - 1 };
    expect(buyCloth(s, c.id)).toEqual({ ok: false, reason: 'no-coins' });
  });

  it('dokładnie tyle monet, ile kosztuje → można kupić', () => {
    const c = CLOTHES[0];
    const n = ok(buyCloth({ ...createState(T0), coins: c.price }, c.id));
    expect(n.coins).toBe(0);
  });

  it('już posiadane → owned (bez pobrania monet)', () => {
    const s = rich();
    expect(buyCloth(s, CLOTHES[0].id)).toEqual({ ok: false, reason: 'owned' });
  });

  it('nieznane → unknown-cloth', () => {
    expect(buyCloth(rich(), 'nie_ma')).toEqual({ ok: false, reason: 'unknown-cloth' });
    expect(buyCloth(rich(), 'constructor')).toEqual({ ok: false, reason: 'unknown-cloth' });
  });
});

describe('wear', () => {
  it('nie założy nieposiadanego ani nieznanego', () => {
    const s = createState(T0);
    expect(wear(s, id('top'))).toEqual({ ok: false, reason: 'not-owned' });
    expect(wear(s, 'nie_ma')).toEqual({ ok: false, reason: 'unknown-cloth' });
  });

  it('zakłada w odpowiednim slocie', () => {
    let s = rich();
    s = ok(wear(s, id('head')));
    s = ok(wear(s, id('top')));
    s = ok(wear(s, id('bottom')));
    expect(s.outfit).toEqual({ head: id('head'), top: id('top'), bottom: id('bottom'), dress: null });
  });

  it('założenie sukienki zdejmuje top i bottom, ale zostawia głowę', () => {
    let s = rich();
    s = ok(wear(s, id('head')));
    s = ok(wear(s, id('top')));
    s = ok(wear(s, id('bottom')));
    s = ok(wear(s, id('dress')));
    expect(s.outfit).toEqual({ head: id('head'), top: null, bottom: null, dress: id('dress') });
  });

  it('założenie koszulki albo dołu zdejmuje sukienkę', () => {
    let s = ok(wear(rich(), id('dress')));
    const withTop = ok(wear(s, id('top')));
    expect(withTop.outfit).toEqual({ head: null, top: id('top'), bottom: null, dress: null });
    const withBottom = ok(wear(s, id('bottom')));
    expect(withBottom.outfit).toEqual({ head: null, top: null, bottom: id('bottom'), dress: null });
    // głowa nie zdejmuje sukienki
    s = ok(wear(s, id('head')));
    expect(s.outfit.dress).toBe(id('dress'));
  });

  it('zamiana ubrania w tym samym slocie', () => {
    let s = ok(wear(rich(), id('top', 0)));
    s = ok(wear(s, id('top', 1)));
    expect(s.outfit.top).toBe(id('top', 1));
  });

  it('ponowne założenie tego samego jest bezpieczne', () => {
    const s = ok(wear(rich(), id('top')));
    expect(ok(wear(s, id('top'))).outfit).toEqual(s.outfit);
  });

  it('nie zmienia wejściowego stanu ani nie rusza monet i posiadanych', () => {
    const s = rich();
    const snap = JSON.stringify(s);
    const n = ok(wear(s, id('dress')));
    expect(JSON.stringify(s)).toBe(snap);
    expect(n.coins).toBe(s.coins);
    expect(n.ownedClothes).toEqual(s.ownedClothes);
  });
});

describe('takeOff / takeOffAll', () => {
  it('zdejmuje tylko dany slot', () => {
    let s = rich();
    s = ok(wear(s, id('head')));
    s = ok(wear(s, id('top')));
    const n = ok(takeOff(s, 'top'));
    expect(n.outfit).toEqual({ head: id('head'), top: null, bottom: null, dress: null });
    expect(n.ownedClothes).toEqual(s.ownedClothes);
  });

  it('zdjęcie sukienki wraca do oryginalnego stroju (null/null)', () => {
    const s = ok(wear(rich(), id('dress')));
    expect(ok(takeOff(s, 'dress')).outfit).toEqual(DEFAULT_OUTFIT);
  });

  it('zdejmowanie pustego slotu jest bezpieczne (stan bez zmian)', () => {
    const s = createState(T0);
    expect(ok(takeOff(s, 'head')).outfit).toEqual(DEFAULT_OUTFIT);
  });

  it('takeOffAll zdejmuje wszystko', () => {
    let s = rich();
    s = ok(wear(s, id('head')));
    s = ok(wear(s, id('dress')));
    expect(takeOffAll(s).outfit).toEqual(DEFAULT_OUTFIT);
    expect(takeOffAll(s).ownedClothes).toEqual(s.ownedClothes);
  });
});

describe('outfitKey', () => {
  it('jest deterministyczny i różny dla różnych strojów', () => {
    const keys = new Set<string>();
    const outfits: Outfit[] = [
      DEFAULT_OUTFIT,
      { ...DEFAULT_OUTFIT, head: 'crown' },
      { ...DEFAULT_OUTFIT, top: 'crown' },
      { ...DEFAULT_OUTFIT, bottom: 'crown' },
      { ...DEFAULT_OUTFIT, dress: 'crown' },
      { head: 'a', top: 'b', bottom: 'c', dress: null },
      { head: 'b', top: 'a', bottom: 'c', dress: null },
    ];
    for (const o of outfits) {
      expect(outfitKey(o)).toBe(outfitKey({ ...o }));
      keys.add(outfitKey(o));
    }
    expect(keys.size).toBe(outfits.length);
  });

  it('nie zależy od kolejności pól w obiekcie', () => {
    const a = { head: 'x', top: 'y', bottom: null, dress: null } as Outfit;
    const b = { dress: null, bottom: null, top: 'y', head: 'x' } as Outfit;
    expect(outfitKey(a)).toBe(outfitKey(b));
  });

  it('przy sukience top i bottom nie mają znaczenia (jedna wpis w cache)', () => {
    const a: Outfit = { head: null, top: 't', bottom: 'b', dress: 'd' };
    const b: Outfit = { head: null, top: null, bottom: null, dress: 'd' };
    expect(outfitKey(a)).toBe(outfitKey(b));
  });

  it('domyślny strój ma stały, niepusty klucz', () => {
    expect(outfitKey(DEFAULT_OUTFIT)).toBe(outfitKey({ head: null, top: null, bottom: null, dress: null }));
    expect(outfitKey(DEFAULT_OUTFIT)).not.toBe('');
  });
});

describe('isOwned', () => {
  it('sprawdza ownedClothes', () => {
    const s = { ...createState(T0), ownedClothes: ['crown'] };
    expect(isOwned(s, 'crown')).toBe(true);
    expect(isOwned(s, 'bow')).toBe(false);
  });
});
