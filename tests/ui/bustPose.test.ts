import { describe, expect, it } from 'vitest';
import { FRAMES } from '../../src/sprites/loader';
import { BUSTS, bustPieces } from '../../src/ui/home/bustPose';

describe('popiersia na nogach idle_front', () => {
  const body = FRAMES.idle_front!;

  it('każde popiersie ma klatkę; mycie zębów i czesanie w swojej skali, czesanie bez ozdoby głowy', () => {
    for (const name of Object.keys(BUSTS)) expect(FRAMES[name], name).toBeDefined();
    for (const name of ['brush_1', 'brush_2', 'brush_3', 'comb_1', 'comb_2', 'comb_3'] as const) {
      expect(BUSTS[name].ownScale, name).toBe(true);
      expect(FRAMES[name]!.scale, name).toBeLessThan(body.scale);
    }
    for (const name of ['comb_1', 'comb_2', 'comb_3']) expect(FRAMES[name]!.noHat, name).toBe(true);
  });

  it('popiersie w swojej skali stoi dolną krawędzią na wierszu cięcia, a głowa jest na wysokości postaci', () => {
    const k = 4;
    const bust = FRAMES.brush_1!;
    const pieces = bustPieces(body, bust, BUSTS.brush_1, k, 64, 150);
    const legs = pieces.find((p) => p.img === 'body')!;
    const top = pieces.find((p) => p.img === 'bust')!;
    expect(top.dy + top.dh).toBe(legs.dy);
    expect(top.dw).toBe(Math.round(bust.w * bust.scale * k));
    // czubek głowy w granicach 3 px logicznych od czubka głowy stojącej Gabi
    const headTop = 150 * k - Math.round((body.foot ?? body.h) * body.scale * k);
    expect(Math.abs(top.dy - headTop)).toBeLessThanOrEqual(3 * k);
    // turban (ta sama skala co nogi) — jak dawniej
    const turban = bustPieces(body, FRAMES.gabi_turban!, BUSTS.gabi_turban, k, 64, 150).find((p) => p.img === 'bust')!;
    expect(turban.dw).toBe(Math.round(FRAMES.gabi_turban!.w * body.scale * k));
  });
});
