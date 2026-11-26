/**
 * Cinemática direta do rig procedural, sem malhas (roda em Node).
 * Usada pelo classificador (comparar direções de segmentos) e pelo gerador
 * sintético dos testes de ida e volta.
 */
import * as THREE from 'three';
import {
  FINGER_BASE_SPLAY,
  FINGER_GEOMETRY,
  RIG_WRIST_POINT,
  THUMB_GEOMETRY,
  type HandPoseTargets,
} from '../components/scene/handRig';
import type { FingerAngles, ThumbAngles } from './types';

export interface HandAngles {
  thumb: ThumbAngles;
  fingers: FingerAngles[];
}

/** Defasagem de flexão entre dedos que o teclado aplica (Hands3DCanvas). */
export const FINGER_STAGGER = 0.03;

/** Converte os alvos do teclado (getPoseFromElis) para ângulos por articulação. */
export function anglesFromPoseTargets(pose: HandPoseTargets, sideSign: 1 | -1): HandAngles {
  return {
    thumb: {
      cmc: [pose.thumbCmcX, pose.thumbCmcY, pose.thumbCmcZ],
      mcp: pose.thumbMcpX,
      ip: pose.thumbIpX,
    },
    fingers: FINGER_GEOMETRY.map(
      (_, i) =>
        pose.fingerOverrides?.[i] ?? {
          mcp: pose.fingerMcpX + i * FINGER_STAGGER,
          pip: pose.fingerPipX,
          dip: pose.fingerDipX,
          splay: sideSign * FINGER_BASE_SPLAY[i] * pose.fingerSplayScale,
        }
    ),
  };
}

const Y = new THREE.Vector3(0, 1, 0);
const rotX = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);

function fingerRotations(f: FingerAngles) {
  const mcp = new THREE.Quaternion().setFromEuler(new THREE.Euler(f.mcp, 0, f.splay, 'XYZ'));
  const pip = mcp.clone().multiply(rotX(f.pip));
  const dip = pip.clone().multiply(rotX(f.dip));
  return [mcp, pip, dip];
}

function thumbRotations(t: ThumbAngles) {
  const cmc = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.cmc[0], t.cmc[1], t.cmc[2], 'XYZ'));
  const mcp = cmc.clone().multiply(rotX(t.mcp));
  const ip = mcp.clone().multiply(rotX(t.ip));
  return [cmc, mcp, ip];
}

/** Direções unitárias dos 3 segmentos do polegar e de cada dedo (espaço do punho). */
export function segmentDirections(angles: HandAngles) {
  return {
    thumb: thumbRotations(angles.thumb).map((q) => Y.clone().applyQuaternion(q)),
    fingers: angles.fingers.map((f) => fingerRotations(f).map((q) => Y.clone().applyQuaternion(q))),
  };
}

/** Posições das 21 articulações no espaço do punho, na ordem dos landmarks do MediaPipe. */
export function localJointPositions(angles: HandAngles, sideSign: 1 | -1, thumbBaseZ = 0.14): THREE.Vector3[] {
  const pts: THREE.Vector3[] = new Array(21);
  pts[0] = new THREE.Vector3(sideSign * RIG_WRIST_POINT[0], RIG_WRIST_POINT[1], 0);

  const chain = (base: THREE.Vector3, rots: THREE.Quaternion[], lens: readonly number[]) => {
    const out = [base.clone()];
    let p = base.clone();
    rots.forEach((q, k) => {
      p = p.clone().add(Y.clone().multiplyScalar(lens[k]).applyQuaternion(q));
      out.push(p);
    });
    return out;
  };

  const thumb = chain(
    new THREE.Vector3(sideSign * THUMB_GEOMETRY.cmc[0], THUMB_GEOMETRY.cmc[1], thumbBaseZ),
    thumbRotations(angles.thumb),
    THUMB_GEOMETRY.len
  );
  thumb.forEach((p, k) => (pts[1 + k] = p));

  FINGER_GEOMETRY.forEach((g, i) => {
    const joints = chain(new THREE.Vector3(sideSign * g.x, g.y, 0), fingerRotations(angles.fingers[i]), g.len);
    joints.forEach((p, k) => (pts[5 + i * 4 + k] = p));
  });

  return pts;
}
