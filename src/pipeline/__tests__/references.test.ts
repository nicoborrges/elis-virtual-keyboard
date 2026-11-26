import { describe, expect, it } from 'vitest';
import references from '../../data/elisReferences.json';
import { ELIS_VISOGRAFEMAS } from '../../data/elisMap';

const STEP_OF = { thumb: 1, fingers: 2, palm: 3, location: 4, movement: 5 } as const;

describe('escritas ELiS de referência', () => {
  it('cada parte existe no mapa da fonte, na etapa certa, e a escrita segue a ordem CD, OP, PA, M', () => {
    for (const entry of references.entries) {
      const parts = Object.entries(entry.parts) as [keyof typeof STEP_OF, string][];
      for (const [part, char] of parts) {
        expect(ELIS_VISOGRAFEMAS.some((v) => v.char === char && v.step === STEP_OF[part]), `${entry.word}: ${part} "${char}"`).toBe(true);
      }
      const ordered = (['thumb', 'fingers', 'palm', 'location', 'movement'] as const).map((p) => entry.parts[p] ?? '').join('');
      expect(entry.elis).toBe(ordered);
    }
  });
});
