import { describe, expect, it } from 'vitest';
import { bodyFrameOf, measureLocation, NEUTRAL_DISTANCE } from '../location';
import type { CapturedHand, CapturedPose, CaptureFrame, Vec3 } from '../types';

/**
 * Corpo sintético visto por câmera comum (sem espelho), imagem 1000×1000.
 * Ombros com 0,2 de largura; a direita de quem sinaliza aparece à ESQUERDA da imagem.
 */
const SIZE = { width: 1000, height: 1000 };

function syntheticPose(): CapturedPose {
  const image: Vec3[] = Array.from({ length: 33 }, () => [0.5, 0.9, 0] as Vec3);
  const set = (i: number, x: number, y: number) => (image[i] = [x, y, 0]);
  set(0, 0.5, 0.29); // nariz
  set(2, 0.53, 0.25); // olho esquerdo
  set(5, 0.47, 0.25); // olho direito
  set(7, 0.57, 0.27); // orelha esquerda
  set(8, 0.43, 0.27); // orelha direita
  set(9, 0.52, 0.33); // boca, canto esquerdo
  set(10, 0.48, 0.33); // boca, canto direito
  set(11, 0.6, 0.5); // ombro esquerdo
  set(12, 0.4, 0.5); // ombro direito
  set(13, 0.66, 0.68); // cotovelo esquerdo
  set(14, 0.34, 0.68);
  set(15, 0.62, 0.82); // punho esquerdo
  set(16, 0.38, 0.82);
  set(23, 0.57, 0.85); // quadril
  set(24, 0.43, 0.85);
  return { image, visibility: image.map(() => 1) };
}

/** Mão com todos os pontos num raio pequeno em torno de `at`, pontas dos dedos em `tips`. */
function handAt(side: 'right' | 'left', at: [number, number], tips: [number, number] = at): CapturedHand {
  const image: Vec3[] = Array.from({ length: 21 }, (_, i) => {
    // pontas em `tips`, meio dos dedos entre a palma e as pontas
    const k = [4, 8, 12, 16, 20].includes(i) ? 1 : i > 1 && i % 4 !== 1 ? 0.5 : 0;
    const x = at[0] + (tips[0] - at[0]) * k;
    const y = at[1] + (tips[1] - at[1]) * k;
    return [x + ((i % 3) - 1) * 0.004, y + ((i % 2) - 0.5) * 0.004, 0];
  });
  return { side, sideSource: 'pose', score: 1, image, world: image };
}

const frame = (...hands: CapturedHand[]): CaptureFrame => ({ t: 0, hands, pose: syntheticPose() });
const best = (f: CaptureFrame, side: 'right' | 'left' = 'right') => measureLocation(f, side, SIZE)!.candidates[0].id;

describe('ponto de articulação (etapa 4) pelo esqueleto do corpo', () => {
  it('coordenadas do corpo: origem nos ombros, x para a direita de quem sinaliza, y para cima', () => {
    const body = bodyFrameOf(syntheticPose(), SIZE)!;
    expect(body.unit).toBeCloseTo(200);
    const [x, y] = body.toBody([0.4, 0.5, 0]); // ombro direito
    expect(x).toBeCloseTo(0.5);
    expect(y).toBeCloseTo(0);
    expect(body.toBody([0.5, 0.25, 0])[1]).toBeGreaterThan(1); // olhos acima
  });

  it('pontas dos dedos na testa → Testa (21)', () => {
    // olhos em y 0,25, boca 0,33: testa ≈ 0,25 − 1,3 × 0,08
    expect(best(frame(handAt('right', [0.47, 0.2], [0.5, 0.146])))).toBe(21);
  });

  it('mão na boca → Boca (27); no queixo → Queixo (30)', () => {
    // palma ao lado, só as pontas dos dedos no ponto (como numa mão real)
    expect(best(frame(handAt('right', [0.42, 0.35], [0.5, 0.33])))).toBe(27);
    expect(best(frame(handAt('right', [0.42, 0.41], [0.5, 0.39])))).toBe(30);
  });

  it('mão no peito → Tórax (34); ao lado do tronco → 36', () => {
    expect(best(frame(handAt('right', [0.5, 0.62], [0.5, 0.61])))).toBe(34);
    expect(best(frame(handAt('right', [0.3, 0.63])))).toBe(36);
  });

  it('mão longe de qualquer âncora → Espaço neutro (33)', () => {
    const m = measureLocation(frame(handAt('right', [0.36, 0.44])), 'right', SIZE)!;
    expect(m.candidates[0].id).toBe(33);
    expect(m.candidates[1].distance).toBeGreaterThan(NEUTRAL_DISTANCE);
  });

  it('não confunde a mão com o próprio punho do esqueleto (Punho 43 é o do outro braço)', () => {
    const f = frame(handAt('right', [0.38, 0.82]));
    expect(best(f)).not.toBe(43);
    // a direita tocando o punho esquerdo
    expect(best(frame(handAt('right', [0.6, 0.8], [0.62, 0.82])))).toBe(43);
  });

  it('mão erguida na frente do próprio ombro não vira Ombro; tocar o outro ombro vira (38)', () => {
    expect(best(frame(handAt('right', [0.4, 0.52], [0.4, 0.46])))).not.toBe(38);
    expect(best(frame(handAt('right', [0.56, 0.52], [0.6, 0.5])))).toBe(38);
  });

  it('dedos da mão dominante na palma da outra mão → Palma da mão (45)', () => {
    const f = frame(handAt('right', [0.47, 0.6], [0.5, 0.65]), handAt('left', [0.5, 0.655], [0.55, 0.62]));
    expect(best(f)).toBe(45);
  });

  it('palma aberta na frente do rosto → Rosto (17); dedos só na testa continua Testa', () => {
    // nariz em (0,5; 0,29); altura do rosto (olhos → boca) = 0,08
    expect(best(frame(handAt('right', [0.5, 0.3], [0.5, 0.2])))).toBe(17);
    expect(best(frame(handAt('right', [0.47, 0.2], [0.5, 0.146])))).toBe(21);
  });

  it('sem ombros visíveis não mede', () => {
    const f = frame(handAt('right', [0.5, 0.36]));
    f.pose!.visibility[11] = 0;
    expect(measureLocation(f, 'right', SIZE)).toBeNull();
  });
});
