import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getPoseFromElis } from '../../components/scene/handRig';
import { measureProportions, rigProportions } from '../proportions';
import { anglesFromPoseTargets } from '../rigKinematics';
import { syntheticHand } from '../synthetic';
import type { LandmarkCapture } from '../types';

describe('proporções da mão (modelagem)', () => {
  it('a mão sintética do rig, em qualquer pose, mede as proporções do próprio rig', () => {
    const rig = rigProportions();
    const hands = ['q', 'w', 'e'].map((thumb) =>
      syntheticHand({
        side: 'right',
        angles: anglesFromPoseTargets(getPoseFromElis(thumb, 'o', 'l', 1), 1),
        rigWristQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.4, 0.2)),
      })
    );
    const capture: LandmarkCapture = {
      schema: 'acme.landmarks',
      version: 1,
      source: { kind: 'image', name: 'sintetico', width: 1280, height: 720 },
      createdAt: '',
      detector: 'synthetic',
      frames: hands.map((h, i) => ({ t: i, hands: [h] })),
    };
    const report = measureProportions([capture])!;
    expect(report.samples).toBe(3);
    expect(report.measured.palmWidth).toBeCloseTo(rig.palmWidth, 5);
    report.measured.fingers.forEach((f, i) => f.forEach((v, k) => expect(v).toBeCloseTo(rig.fingers[i][k], 5)));
    report.measured.thumb.forEach((v, k) => expect(v).toBeCloseTo(rig.thumb[k], 5));
  });

  it('rig: dedo médio mais longo que o mínimo, palma mais longa que larga', () => {
    const rig = rigProportions();
    const total = (f: number[]) => f.reduce((a, b) => a + b, 0);
    expect(total(rig.fingers[1])).toBeGreaterThan(total(rig.fingers[3]));
    expect(rig.palmWidth).toBeLessThan(1);
  });
});
