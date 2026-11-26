/**
 * Limpeza dos landmarks de vídeo: preenchimento de falhas curtas e suavização
 * One Euro (Casiez et al., 2012) — reduz tremor sem atrasar movimentos rápidos.
 */
import type { CaptureFrame, CapturedHand, HandSide, LandmarkCapture, Vec3 } from './types';

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number) {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  last() {
    return this.y;
  }
}

class OneEuro {
  private x = new LowPass();
  private dx = new LowPass();
  private prevT: number | null = null;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value: number, t: number) {
    if (this.prevT === null || t <= this.prevT) {
      this.prevT = t;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = t - this.prevT;
    this.prevT = t;
    const prev = this.x.last() ?? value;
    const edx = this.dx.filter((value - prev) / dt, OneEuro.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, OneEuro.alpha(cutoff, dt));
  }
}

export interface SmoothOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

const SIDES: HandSide[] = ['right', 'left'];

/** Suaviza cada coordenada de cada landmark ao longo do tempo (por mão). */
export function smoothCapture(capture: LandmarkCapture, opts: SmoothOptions = {}): LandmarkCapture {
  const { minCutoff = 1.5, beta = 0.3, dCutoff = 1 } = opts;
  type Bank = { image: OneEuro[][]; world: OneEuro[][] };
  const makeBank = (): Bank => ({
    image: Array.from({ length: 21 }, () => [0, 1, 2].map(() => new OneEuro(minCutoff, beta, dCutoff))),
    world: Array.from({ length: 21 }, () => [0, 1, 2].map(() => new OneEuro(minCutoff, beta, dCutoff))),
  });
  const banks: Partial<Record<HandSide, Bank>> = {};
  const lastSeen: Partial<Record<HandSide, number>> = {};

  const frames = capture.frames.map((f) => {
    const hands = f.hands.map((h) => {
      // Recomeça o filtro se a mão sumiu por mais de 0,5 s
      if (!banks[h.side] || (lastSeen[h.side] !== undefined && f.t - lastSeen[h.side]! > 0.5)) {
        banks[h.side] = makeBank();
      }
      lastSeen[h.side] = f.t;
      const bank = banks[h.side]!;
      const apply = (pts: Vec3[], filters: OneEuro[][]): Vec3[] =>
        pts.map((p, i) => [0, 1, 2].map((k) => filters[i][k].filter(p[k], f.t)) as Vec3);
      return { ...h, image: apply(h.image, bank.image), world: apply(h.world, bank.world) };
    });
    return { ...f, hands };
  });

  return { ...capture, frames, cleaning: { gapFillMaxFrames: capture.cleaning?.gapFillMaxFrames ?? 0, smoothing: true } };
}

const lerpVec = (a: Vec3, b: Vec3, u: number): Vec3 => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u,
];

/** Preenche ausências curtas de uma mão (≤ maxFrames) interpolando entre os vizinhos. */
export function fillGaps(capture: LandmarkCapture, maxFrames = 4): LandmarkCapture {
  const frames: CaptureFrame[] = capture.frames.map((f) => ({ ...f, hands: [...f.hands] }));

  for (const side of SIDES) {
    const present = frames.map((f) => f.hands.find((h) => h.side === side));
    let i = 0;
    while (i < frames.length) {
      if (present[i]) {
        i++;
        continue;
      }
      const start = i;
      while (i < frames.length && !present[i]) i++;
      const before = present[start - 1];
      const after = present[i];
      const gap = i - start;
      if (!before || !after || gap > maxFrames) continue;
      for (let k = 0; k < gap; k++) {
        const u = (k + 1) / (gap + 1);
        const filled: CapturedHand = {
          side,
          sideSource: before.sideSource,
          score: Math.min(before.score, after.score),
          image: before.image.map((p, j) => lerpVec(p, after.image[j], u)),
          world: before.world.map((p, j) => lerpVec(p, after.world[j], u)),
        };
        frames[start + k].hands.push(filled);
      }
    }
  }

  return { ...capture, frames, cleaning: { smoothing: capture.cleaning?.smoothing ?? false, gapFillMaxFrames: maxFrames } };
}
