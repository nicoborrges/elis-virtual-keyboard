/**
 * Sugestão de visografemas ELiS (etapas 1–3) a partir de uma mão resolvida.
 *
 * Compara a mão capturada com as poses canônicas do teclado (getPoseFromElis,
 * que já incorpora a calibração): direções dos segmentos para polegar e dedos,
 * normal da palma para a orientação. É sugestão — a escrita final é confirmada
 * por um humano (e validada pela equipe da Letras-UFG).
 *
 * Ponto de articulação (etapa 4) e movimento (etapa 5) ainda não são sugeridos.
 */
import * as THREE from 'three';
import { getPoseFromElis } from '../components/scene/handRig';
import { ELIS_VISOGRAFEMAS } from '../data/elisMap';
import { anglesFromPoseTargets, segmentDirections, type HandAngles } from './rigKinematics';
import type { SolvedHand } from './types';

export interface Suggestion {
  step: 1 | 2 | 3;
  char: string;
  label: string;
  /** 0 = idêntico à pose canônica. */
  distance: number;
  /** Probabilidade relativa entre os candidatos da mesma etapa (0–1). */
  confidence: number;
}

export interface HandSuggestions {
  thumb: Suggestion[];
  fingers: Suggestion[];
  palm: Suggestion[];
}

const TEMPERATURE = 0.12;

const segDistance = (a: THREE.Vector3[], b: THREE.Vector3[]) =>
  a.reduce((acc, v, i) => acc + (1 - THREE.MathUtils.clamp(v.dot(b[i]), -1, 1)), 0);

function rank(step: 1 | 2 | 3, scored: { char: string; distance: number }[]): Suggestion[] {
  const weights = scored.map((s) => Math.exp(-s.distance / TEMPERATURE));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return scored
    .map((s, i) => ({
      step,
      char: s.char,
      label: ELIS_VISOGRAFEMAS.find((v) => v.step === step && v.char === s.char)?.label ?? s.char,
      distance: s.distance,
      confidence: weights[i] / total,
    }))
    .sort((a, b) => a.distance - b.distance);
}

const charsOf = (step: 1 | 2 | 3) => ELIS_VISOGRAFEMAS.filter((v) => v.step === step).map((v) => v.char);

export function palmNormalOfQuat(q: [number, number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(q[0], q[1], q[2], q[3]));
}

export function suggestForHand(hand: SolvedHand, sideSign: 1 | -1): HandSuggestions {
  const observed = segmentDirections({ thumb: hand.thumb, fingers: hand.fingers } as HandAngles);

  const thumb = rank(
    1,
    charsOf(1).map((char) => {
      const canon = segmentDirections(anglesFromPoseTargets(getPoseFromElis(char, null, null, sideSign), sideSign));
      return { char, distance: segDistance(observed.thumb, canon.thumb) };
    })
  );

  const fingers = rank(
    2,
    charsOf(2).map((char) => {
      const canon = segmentDirections(anglesFromPoseTargets(getPoseFromElis(null, char, null, sideSign), sideSign));
      const d = canon.fingers.reduce((acc, segs, i) => acc + segDistance(observed.fingers[i], segs), 0) / 4;
      return { char, distance: d };
    })
  );

  const obsNormal = palmNormalOfQuat(hand.wristQuat);
  const palm = rank(
    3,
    charsOf(3).map((char) => {
      const p = getPoseFromElis(null, null, char, sideSign);
      const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(p.wristRotX, p.wristRotY, p.wristRotZ, 'XYZ'));
      return { char, distance: 1 - obsNormal.dot(n) };
    })
  );

  return { thumb, fingers, palm };
}
