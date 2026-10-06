import { describe, expect, it } from 'vitest';
import { ROOM_BOUNDS } from '../../src/pet/brain';
import { DISPLAY_HEIGHT } from '../../src/sprites/loader';
import { DRAG, clampRoomX, dragAnimation, heldFeetY, smoothSpeed } from '../../src/ui/petDrag';

describe('dragAnimation', () => {
  it('najpierw złapanie, potem dyndanie albo panika', () => {
    expect(dragAnimation(0, 500, false)).toBe('drag_pick');
    expect(dragAnimation(DRAG.pickMs - 1, 500, false)).toBe('drag_pick');
    expect(dragAnimation(DRAG.pickMs, 0, false)).toBe('drag_dangle');
    expect(dragAnimation(DRAG.pickMs, DRAG.panicSpeed, false)).toBe('drag_dangle');
    expect(dragAnimation(DRAG.pickMs, DRAG.panicSpeed + 1, false)).toBe('drag_panic');
  });
  it('panika trwa, dopóki palec nie zwolni poniżej progu uspokojenia', () => {
    expect(dragAnimation(1000, 100, true)).toBe('drag_panic');
    expect(dragAnimation(1000, 100, false)).toBe('drag_dangle');
    expect(dragAnimation(1000, DRAG.calmSpeed, true)).toBe('drag_dangle');
  });
});

describe('heldFeetY', () => {
  const meta = { w: 40, h: 70, anchorX: 20, scale: 0.9, foot: 60 };
  it('czubek obrazka pod palcem: stopy = góra + foot·scale', () => {
    expect(heldFeetY(meta, 50, 144)).toBeCloseTo(50 + 54);
    expect(heldFeetY({ ...meta, foot: undefined }, 50, 144)).toBeCloseTo(50 + 63);
  });
  it('nigdy poniżej podłogi', () => {
    expect(heldFeetY(meta, 120, 144)).toBe(144);
  });
  it('bez metadanych — wysokość postaci', () => {
    expect(heldFeetY(undefined, 20, 144)).toBe(20 + DISPLAY_HEIGHT);
  });
});

describe('pomocnicze', () => {
  it('wygładzanie prędkości', () => {
    expect(smoothSpeed(100, 0)).toBeCloseTo(70);
    expect(smoothSpeed(0, 100)).toBeCloseTo(30);
  });
  it('X w granicach pokoju', () => {
    expect(clampRoomX(0)).toBe(ROOM_BOUNDS.minX);
    expect(clampRoomX(500)).toBe(ROOM_BOUNDS.maxX);
    expect(clampRoomX(64)).toBe(64);
  });
});
