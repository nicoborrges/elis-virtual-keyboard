/**
 * Proporções da mão (modelagem 3D): comprimento de cada segmento dividido pelo
 * comprimento da palma (punho → base do dedo médio), medido nos landmarks 3D do
 * MediaPipe e comparado com a geometria do rig procedural.
 *
 * Razões não dependem da escala nem da distância à câmera. Não precisam de rótulo
 * ELiS: qualquer mão bem detectada serve de amostra.
 */
import { FINGER_CHAINS, HAND_LM } from './solver';
import { localJointPositions, type HandAngles } from './rigKinematics';
import type { LandmarkCapture, Vec3 } from './types';

export interface HandProportions {
  /** Base do indicador → base do mínimo, em palmas. */
  palmWidth: number;
  /** Polegar: CMC→MCP, MCP→IP, IP→ponta, em palmas. */
  thumb: [number, number, number];
  /** Indicador, médio, anelar, mínimo: MCP→PIP, PIP→DIP, DIP→ponta, em palmas. */
  fingers: [number, number, number][];
}

export const FINGER_NAMES = ['indicador', 'médio', 'anelar', 'mínimo'] as const;

const len = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function handProportions(points: Vec3[]): HandProportions | null {
  const palm = len(points[HAND_LM.WRIST], points[HAND_LM.MIDDLE[0]]);
  if (palm < 1e-6) return null;
  const chain = (ids: readonly number[]) =>
    [len(points[ids[0]], points[ids[1]]) / palm, len(points[ids[1]], points[ids[2]]) / palm, len(points[ids[2]], points[ids[3]]) / palm] as [
      number,
      number,
      number,
    ];
  return {
    palmWidth: len(points[HAND_LM.INDEX[0]], points[HAND_LM.PINKY[0]]) / palm,
    thumb: chain(HAND_LM.THUMB),
    fingers: FINGER_CHAINS.map(chain),
  };
}

/** Proporções do rig, medidas da mesma forma na mão em repouso (dedos esticados). */
export function rigProportions(): HandProportions {
  const rest: HandAngles = {
    thumb: { cmc: [0, 0, 0], mcp: 0, ip: 0 },
    fingers: [0, 1, 2, 3].map(() => ({ mcp: 0, pip: 0, dip: 0, splay: 0 })),
  };
  const pts = localJointPositions(rest, 1).map((v): Vec3 => [v.x, v.y, v.z]);
  return handProportions(pts)!;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface ProportionReport {
  /** Mediana sobre todas as mãos aceitas. */
  measured: HandProportions;
  rig: HandProportions;
  /** Quantas mãos entraram na mediana. */
  samples: number;
}

/**
 * Mediana das proporções em todas as mãos com score ≥ `minScore`. A mediana tolera
 * quadros com dedos escondidos atrás da palma, que encurtam segmentos.
 */
export function measureProportions(captures: LandmarkCapture[], minScore = 0.8): ProportionReport | null {
  const all: HandProportions[] = [];
  for (const c of captures)
    for (const f of c.frames)
      for (const h of f.hands) {
        if (h.score < minScore) continue;
        const p = handProportions(h.world);
        if (p) all.push(p);
      }
  if (!all.length) return null;
  const measured: HandProportions = {
    palmWidth: median(all.map((p) => p.palmWidth)),
    thumb: [0, 1, 2].map((k) => median(all.map((p) => p.thumb[k]))) as [number, number, number],
    fingers: [0, 1, 2, 3].map((i) => [0, 1, 2].map((k) => median(all.map((p) => p.fingers[i][k]))) as [number, number, number]),
  };
  return { measured, rig: rigProportions(), samples: all.length };
}
