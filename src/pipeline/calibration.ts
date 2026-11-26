/**
 * Calibração das poses canônicas dos visografemas a partir de fotos reais.
 * Cada amostra entra numa média; o resultado vai para src/data/rigCalibration.json
 * e passa a ser usado pelo teclado (getPoseFromElis) e pelo classificador.
 *
 * Tudo é guardado na convenção da mão direita: amostras da mão esquerda têm os
 * eixos Y/Z das rotações e a abertura lateral espelhados.
 */
import * as THREE from 'three';
import type { FingerAngles, RigCalibration, SolvedHand, ThumbAngles, Vec3 } from './types';

export type CalibrationStep = 'thumb' | 'fingers' | 'palm';

export function emptyCalibration(): RigCalibration {
  return { schema: 'acme.rigcalibration', version: 1, thumb: {}, fingers: {}, palm: {} };
}

const mirrorEuler = (e: Vec3, s: 1 | -1): Vec3 => [e[0], s * e[1], s * e[2]];

const eulerToQuat = (e: Vec3) => new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], 'XYZ'));

const quatToEuler = (q: THREE.Quaternion): Vec3 => {
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x, e.y, e.z];
};

/** Média incremental de rotações (n amostras anteriores + 1 nova). */
function averageEuler(prev: Vec3 | undefined, n: number, next: Vec3): Vec3 {
  if (!prev || n === 0) return next;
  const a = eulerToQuat(prev);
  const b = eulerToQuat(next);
  if (a.dot(b) < 0) b.set(-b.x, -b.y, -b.z, -b.w);
  const q = new THREE.Quaternion(a.x * n + b.x, a.y * n + b.y, a.z * n + b.z, a.w * n + b.w).normalize();
  return quatToEuler(q);
}

const avg = (prev: number | undefined, n: number, next: number) => (prev === undefined || n === 0 ? next : (prev * n + next) / (n + 1));

/** Converte uma mão resolvida para a convenção da mão direita. */
export function toRightHandConvention(hand: SolvedHand, sideSign: 1 | -1) {
  const wrist = new THREE.Quaternion(...hand.wristQuat);
  return {
    thumb: { cmc: mirrorEuler(hand.thumb.cmc, sideSign), mcp: hand.thumb.mcp, ip: hand.thumb.ip } as ThumbAngles,
    fingers: hand.fingers.map((f): FingerAngles => ({ ...f, splay: sideSign * f.splay })),
    wristEuler: mirrorEuler(quatToEuler(wrist), sideSign),
  };
}

export function addCalibrationSample(
  cal: RigCalibration,
  step: CalibrationStep,
  char: string,
  hand: SolvedHand,
  sideSign: 1 | -1
): RigCalibration {
  const r = toRightHandConvention(hand, sideSign);
  const next: RigCalibration = {
    ...cal,
    thumb: { ...cal.thumb },
    fingers: { ...cal.fingers },
    palm: { ...cal.palm },
  };

  if (step === 'thumb') {
    const prev = cal.thumb[char];
    const n = prev?.samples ?? 0;
    next.thumb[char] = {
      cmc: averageEuler(prev?.cmc, n, r.thumb.cmc),
      mcp: avg(prev?.mcp, n, r.thumb.mcp),
      ip: avg(prev?.ip, n, r.thumb.ip),
      samples: n + 1,
    };
  } else if (step === 'fingers') {
    const prev = cal.fingers[char];
    const n = prev?.samples ?? 0;
    next.fingers[char] = {
      fingers: r.fingers.map((f, i) => ({
        mcp: avg(prev?.fingers[i]?.mcp, n, f.mcp),
        pip: avg(prev?.fingers[i]?.pip, n, f.pip),
        dip: avg(prev?.fingers[i]?.dip, n, f.dip),
        splay: avg(prev?.fingers[i]?.splay, n, f.splay),
      })),
      samples: n + 1,
    };
  } else {
    const prev = cal.palm[char];
    const n = prev?.samples ?? 0;
    next.palm[char] = { wristEuler: averageEuler(prev?.wristEuler, n, r.wristEuler), samples: n + 1 };
  }
  return next;
}

export function removeCalibration(cal: RigCalibration, step: CalibrationStep, char: string): RigCalibration {
  const next: RigCalibration = { ...cal, thumb: { ...cal.thumb }, fingers: { ...cal.fingers }, palm: { ...cal.palm } };
  delete next[step][char];
  return next;
}

/** Arredonda números para reduzir o tamanho dos JSON versionados. */
export function roundDeep<T>(value: T, digits = 4): T {
  const f = 10 ** digits;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'number') return Math.round(v * f) / f;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
