/**
 * Gerador sintético: pose do rig → landmarks no formato do MediaPipe.
 * Serve para testes de ida e volta (rig → landmarks → solver → rig).
 *
 * Atenção: ele compartilha as convenções de eixo do solver, então valida a
 * consistência interna — não a interpretação do detector real. Só filmagem
 * real confirma isso.
 */
import * as THREE from 'three';
import { localJointPositions, type HandAngles } from './rigKinematics';
import { mirrorQuatX, sceneToWorld } from './solver';
import type { CapturedHand, HandSide, Vec3 } from './types';

/** 1 unidade do rig ≈ 8 cm (palma ~8 cm). */
const RIG_TO_METERS = 0.08;

export interface SyntheticHandOptions {
  side: HandSide;
  angles: HandAngles;
  /** Orientação do punho na convenção do rig (como Hands3DCanvas a desenha). */
  rigWristQuat: THREE.Quaternion;
  /** Posição do punho na imagem normalizada. */
  imageWrist?: [number, number];
  /** Pixels por metro, para projetar a imagem. */
  pxPerMeter?: number;
  imageSize?: { width: number; height: number };
}

export function syntheticHand(opts: SyntheticHandOptions): CapturedHand {
  const sign = opts.side === 'right' ? 1 : -1;
  const anatomical = mirrorQuatX(opts.rigWristQuat);
  const local = localJointPositions(opts.angles, sign);
  const wristLocal = local[0].clone();
  const scene = local.map((p) => p.clone().sub(wristLocal).multiplyScalar(RIG_TO_METERS).applyQuaternion(anatomical));
  const world = scene.map((p) => sceneToWorld(p));

  const [wx, wy] = opts.imageWrist ?? [0.5, 0.5];
  const size = opts.imageSize ?? { width: 1280, height: 720 };
  const ppm = opts.pxPerMeter ?? 1500;
  const image = world.map((p): Vec3 => [wx + (p[0] * ppm) / size.width, wy + (p[1] * ppm) / size.height, p[2]]);

  return { side: opts.side, sideSource: 'pose', score: 1, image, world };
}
