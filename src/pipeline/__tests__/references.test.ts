import { describe, expect, it } from 'vitest';
import references from '../../data/elisReferences.json';
import { ELIS_VISOGRAFEMAS } from '../../data/elisMap';

const STEP_OF = { thumb: 1, fingers: 2, palm: 3, location: 4, movement: 5 } as const;
type Part = keyof typeof STEP_OF;
type Hand = Partial<Record<Part, string>>;

const handsOf = (entry: (typeof references.entries)[number]): Hand[] => {
  const e = entry as { hands?: Record<string, Hand>; parts?: Record<string, Hand>[] };
  return [...Object.values(e.hands ?? {}), ...(e.parts ?? []).flatMap((p) => Object.values(p))];
};

describe('escritas ELiS de referência', () => {
  it('cada glifo das partes existe no mapa da fonte, na etapa certa, e aparece na escrita', () => {
    for (const entry of references.entries) {
      for (const hand of handsOf(entry)) {
        for (const [part, glyphs] of Object.entries(hand) as [Part, string][]) {
          for (const char of glyphs) {
            expect(ELIS_VISOGRAFEMAS.some((v) => v.char === char && v.step === STEP_OF[part]), `${entry.word}: ${part} "${char}"`).toBe(true);
            expect(entry.elis.includes(char), `${entry.word}: "${char}" fora da escrita`).toBe(true);
          }
        }
      }
    }
  });

  it('sinal monomanual: a escrita é polegar, dedos, palma, local e movimento, nessa ordem', () => {
    for (const entry of references.entries.filter((e) => e.signType === 'monomanual')) {
      const d = (entry as { hands: { dominant: Hand } }).hands.dominant;
      const ordered = (['thumb', 'fingers', 'palm', 'location', 'movement'] as const).map((p) => d[p] ?? '').join('');
      expect(entry.elis).toBe(ordered);
    }
  });
});
