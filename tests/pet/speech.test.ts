import { describe, expect, it } from 'vitest';
import { pick, pickLine } from '../../src/pet/speech';
import { content } from '../../src/content';

const first = () => 0;

describe('pickLine', () => {
  it('głód ma pierwszeństwo', () => {
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 10, energy: 10 }, first));
  });
  it('śpiąca', () => {
    expect(content.lines.sleepy).toContain(pickLine({ hunger: 90, mood: 90, energy: 10 }, first));
  });
  it('znudzona', () => {
    expect(content.lines.bored).toContain(pickLine({ hunger: 90, mood: 10, energy: 90 }, first));
  });
  it('zadowolona: zwykła kwestia albo losowy tekst', () => {
    expect(content.lines.happy).toContain(pickLine({ hunger: 90, mood: 90, energy: 90 }, () => 0.9));
    expect(content.lines.random).toContain(pickLine({ hunger: 90, mood: 90, energy: 90 }, first));
  });
  it('losowe teksty Gabi', () => {
    expect(content.lines.random).toContain('Jestem kierowniczka.');
    expect(content.lines.random).toHaveLength(12);
    // przy potrzebach — bez losowych tekstów
    expect(content.lines.random).not.toContain(pickLine({ hunger: 10, mood: 90, energy: 90 }, first));
  });
});

describe('pick', () => {
  it('nie wychodzi poza tablicę', () => {
    expect(pick(['a', 'b'], () => 0.999)).toBe('b');
    expect(pick(['a', 'b'], () => 1)).toBe('a');
  });
});
