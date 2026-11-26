import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getPoseFromElis } from '../../components/scene/handRig';
import { suggestForHand } from '../classify';
import { addCalibrationSample, emptyCalibration } from '../calibration';
import { fillGaps, smoothCapture } from '../filter';
import { anglesFromPoseTargets, segmentDirections } from '../rigKinematics';
import { assignHandSides, solveCapture, solveHandPose, POSE_LM } from '../solver';
import { syntheticHand } from '../synthetic';
import type { CapturedPose, HandSide, LandmarkCapture, SolvedHand, Vec3 } from '../types';
import realFixture from './fixtures/mediapipe-rig-right-tgl.json';

const THUMBS = ['q', 'w', 'e', 'r', 't', 'y'];
const FINGERS = ['q', 'u', 'o', 's', 'g'];
const PALMS = ['l', 'ç', 'z', 'x', 'c', 'v'];
const SIDES: { side: HandSide; sign: 1 | -1 }[] = [
  { side: 'right', sign: 1 },
  { side: 'left', sign: -1 },
];

function synthFromElis(side: HandSide, sign: 1 | -1, thumb: string | null, fingers: string | null, palm: string | null) {
  const pose = getPoseFromElis(thumb, fingers, palm, sign);
  const rigWristQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pose.wristRotX, pose.wristRotY, pose.wristRotZ, 'XYZ')
  );
  return {
    pose,
    hand: syntheticHand({ side, angles: anglesFromPoseTargets(pose, sign), rigWristQuat }),
    rigWristQuat,
  };
}

const solved = (h: ReturnType<typeof synthFromElis>['hand']): SolvedHand => ({ ...solveHandPose(h), offset: [0, 0, 0] });

describe('ida e volta rig → landmarks → solver', () => {
  for (const { side, sign } of SIDES) {
    it(`recupera a orientação do punho (${side})`, () => {
      for (const palm of PALMS) {
        const { hand, rigWristQuat } = synthFromElis(side, sign, 'y', 'g', palm);
        const q = new THREE.Quaternion(...solved(hand).wristQuat);
        expect(q.angleTo(rigWristQuat), `palma ${palm}`).toBeLessThan(1e-3);
      }
    });

    it(`recupera as direções dos segmentos (${side})`, () => {
      for (const thumb of THUMBS) {
        for (const fingers of FINGERS) {
          const { pose, hand } = synthFromElis(side, sign, thumb, fingers, 'l');
          const s = solved(hand);
          const got = segmentDirections({ thumb: s.thumb, fingers: s.fingers });
          const want = segmentDirections(anglesFromPoseTargets(pose, sign));
          got.thumb.forEach((d, i) => expect(d.angleTo(want.thumb[i]), `polegar ${thumb} seg ${i}`).toBeLessThan(1e-3));
          got.fingers.forEach((segs, f) =>
            segs.forEach((d, i) => expect(d.angleTo(want.fingers[f][i]), `dedos ${fingers} f${f} s${i}`).toBeLessThan(1e-3))
          );
        }
      }
    });

    it(`sugere o visografema certo de polegar, dedos e palma (${side})`, () => {
      for (const thumb of THUMBS) {
        const { hand } = synthFromElis(side, sign, thumb, 'g', 'l');
        expect(suggestForHand(solved(hand), sign).thumb[0].char, `polegar ${thumb}`).toBe(thumb);
      }
      for (const fingers of FINGERS) {
        const { hand } = synthFromElis(side, sign, 'y', fingers, 'l');
        expect(suggestForHand(solved(hand), sign).fingers[0].char, `dedos ${fingers}`).toBe(fingers);
      }
      for (const palm of PALMS) {
        const { hand } = synthFromElis(side, sign, 'y', 'g', palm);
        expect(suggestForHand(solved(hand), sign).palm[0].char, `palma ${palm}`).toBe(palm);
      }
    });
  }

  it('distingue palma medial (z) de distal (x) pela direção real na cena', () => {
    // Mão direita de quem sinaliza com a palma virada para o próprio centro
    // (para a esquerda de quem sinaliza = direita da câmera = +x na cena, sem espelho).
    const fingersUp = new THREE.Vector3(0, 1, 0);
    const palmToCameraRight = new THREE.Vector3(1, 0, 0);
    const thumbSide = new THREE.Vector3().crossVectors(fingersUp, palmToCameraRight);
    const anatomical = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(thumbSide, fingersUp, palmToCameraRight)
    );
    const rigQuat = new THREE.Quaternion(anatomical.x, -anatomical.y, -anatomical.z, anatomical.w);
    const pose = getPoseFromElis('y', 'g', null, 1);
    const hand = syntheticHand({ side: 'right', angles: anglesFromPoseTargets(pose, 1), rigWristQuat: rigQuat });
    expect(suggestForHand(solved(hand), 1).palm[0].char).toBe('z');
  });
});

describe('lado das mãos e deslocamento', () => {
  const size = { width: 1280, height: 720 };
  const poseWith = (rightWrist: Vec3, leftWrist: Vec3): CapturedPose => {
    const image: Vec3[] = Array.from({ length: 33 }, () => [0.5, 0.5, 0]);
    const visibility = Array.from({ length: 33 }, () => 1);
    image[POSE_LM.RIGHT_WRIST] = rightWrist;
    image[POSE_LM.LEFT_WRIST] = leftWrist;
    image[POSE_LM.RIGHT_SHOULDER] = [0.4, 0.4, 0];
    image[POSE_LM.LEFT_SHOULDER] = [0.6, 0.4, 0];
    return { image, visibility };
  };

  it('usa o punho do corpo mais próximo mesmo com rótulo trocado', () => {
    const { hand } = synthFromElis('right', 1, 'y', 'g', 'l');
    // Rótulo "Right" numa imagem não espelhada = mão esquerda (errado de propósito aqui)
    const raw = { image: hand.image.map((p): Vec3 => [p[0] - 0.2, p[1], p[2]]), world: hand.world, label: 'Right', score: 0.9 };
    const pose = poseWith([raw.image[0][0], raw.image[0][1], 0], [0.8, 0.6, 0]);
    const [assigned] = assignHandSides([raw], pose, size);
    expect(assigned.side).toBe('right');
    expect(assigned.sideSource).toBe('pose');
  });

  it('sem corpo, usa o rótulo do detector na convenção selfie observada', () => {
    const { hand } = synthFromElis('right', 1, 'y', 'g', 'l');
    const [a] = assignHandSides([{ image: hand.image, world: hand.world, label: 'Left', score: 0.9 }], undefined, size);
    expect(a.side).toBe('right');
    const [b] = assignHandSides([{ image: hand.image, world: hand.world, label: 'Left', score: 0.9 }], undefined, size, true);
    expect(b.side).toBe('left');
  });

  it('saída REAL do MediaPipe (render do rig: mão direita, t g l) é lida corretamente', () => {
    const raw = { image: realFixture.image as Vec3[], world: realFixture.world as Vec3[], label: realFixture.label, score: realFixture.score };
    const [hand] = assignHandSides([raw], undefined, realFixture.source);
    expect(hand.side).toBe('right');
    const sug = suggestForHand({ ...solveHandPose(hand), offset: [0, 0, 0] }, 1);
    expect(sug.thumb[0].char).toBe('t');
    expect(sug.fingers[0].char).toBe('g');
    expect(sug.palm[0].char).toBe('l');
  });

  const captureOf = (frames: LandmarkCapture['frames']): LandmarkCapture => ({
    schema: 'acme.landmarks',
    version: 1,
    source: { kind: 'video', name: 'teste', width: 1280, height: 720, fps: 30 },
    createdAt: '2026-11-26T00:00:00Z',
    detector: 'synthetic',
    frames,
  });

  it('mover a mão direita para a direita de quem sinaliza vira +x no rig (movimento 58)', () => {
    const a = synthFromElis('right', 1, 'y', 'g', 'l').hand;
    // A direita de quem sinaliza aparece à ESQUERDA da imagem (x menor)
    const b = { ...a, image: a.image.map((p): Vec3 => [p[0] - 0.1, p[1], p[2]]) };
    const frames = solveCapture(captureOf([{ t: 0, hands: [a] }, { t: 0.1, hands: [b] }]));
    expect(frames[1].dominant!.offset[0]).toBeGreaterThan(0);
  });

  it('sinalizante canhoto: a mão esquerda vira a dominante do rig', () => {
    const left = synthFromElis('left', -1, 'y', 'g', 'l').hand;
    const frames = solveCapture(captureOf([{ t: 0, hands: [left] }]), { dominantHand: 'left' });
    expect(frames[0].dominant).toBeDefined();
    expect(frames[0].nonDominant).toBeUndefined();
  });
});

describe('limpeza e calibração', () => {
  const base = (t: number, dx = 0) => {
    const h = synthFromElis('right', 1, 'y', 'g', 'l').hand;
    return { t, hands: [{ ...h, image: h.image.map((p): Vec3 => [p[0] + dx, p[1], p[2]]) }] };
  };
  const cap = (frames: LandmarkCapture['frames']): LandmarkCapture => ({
    schema: 'acme.landmarks', version: 1,
    source: { kind: 'video', name: 't', width: 1280, height: 720, fps: 30 },
    createdAt: '', detector: 'synthetic', frames,
  });

  it('preenche falhas curtas por interpolação', () => {
    const filled = fillGaps(cap([base(0, 0), { t: 1 / 30, hands: [] }, base(2 / 30, 0.1)]), 4);
    expect(filled.frames[1].hands).toHaveLength(1);
    expect(filled.frames[1].hands[0].image[0][0]).toBeCloseTo(base(0).hands[0].image[0][0] + 0.05, 5);
  });

  it('suavização mantém uma pose parada intacta', () => {
    const frames = Array.from({ length: 10 }, (_, i) => base(i / 30));
    const smooth = smoothCapture(cap(frames));
    expect(smooth.frames[9].hands[0].world[8][1]).toBeCloseTo(frames[9].hands[0].world[8][1], 6);
  });

  it('amostra de calibração da mão esquerda reproduz a pose ao aplicar no lado esquerdo', () => {
    const { hand } = synthFromElis('left', -1, 'e', 'o', 'z');
    const s = solved(hand);
    const cal = addCalibrationSample(emptyCalibration(), 'thumb', 'e', s, -1);
    const canonLeft = getPoseFromElis('e', null, null, -1);
    expect(cal.thumb.e.cmc[0]).toBeCloseTo(canonLeft.thumbCmcX, 3);
    // Guardado na convenção da mão direita
    const canonRight = getPoseFromElis('e', null, null, 1);
    const dirs = segmentDirections({ thumb: { cmc: cal.thumb.e.cmc, mcp: cal.thumb.e.mcp, ip: cal.thumb.e.ip }, fingers: [] });
    const want = segmentDirections(anglesFromPoseTargets(canonRight, 1));
    dirs.thumb.forEach((d, i) => expect(d.angleTo(want.thumb[i])).toBeLessThan(1e-3));
  });
});
