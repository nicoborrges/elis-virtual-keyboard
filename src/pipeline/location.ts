/**
 * Ponto de articulação (etapa 4) medido em relação ao corpo de quem sinaliza.
 *
 * Usa o esqueleto do corpo (BlazePose) para montar âncoras de cada visografema de
 * Local (testa, boca, tórax...) e mede a distância até os pontos da mão que mais
 * tocam o corpo (pontas dos dedos, meio dos dedos, centro da palma). Tudo em 2D, no
 * plano da imagem, em unidades de largura dos ombros: a câmera não vê profundidade,
 * então "perto" quer dizer "sobreposto na imagem", não necessariamente "tocando".
 *
 * Coordenadas do corpo: origem no meio dos ombros, x para a DIREITA de quem
 * sinaliza, y para cima, 1 unidade = largura dos ombros.
 *
 * Alguns visografemas não são distinguíveis só com o esqueleto 2D e ficam de fora
 * (`UNMEASURED_LOCATIONS`). Esta medida é sugestão: a escrita final é humana.
 */
import { ELIS_VISOGRAFEMAS } from '../data/elisMap';
import { HAND_LM, POSE_LM } from './solver';
import type { CaptureFrame, CapturedHand, CapturedPose, HandSide, Vec3 } from './types';

export type Vec2 = [number, number];

const POSE_EXTRA = {
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

/** Rosto genérico, lábio × dentes, palma × dorso etc. não se separam no esqueleto 2D. */
export const UNMEASURED_LOCATIONS = [17, 26, 28, 37, 39, 40, 44, 46, 48, 49, 50] as const;

/** Distância (largura dos ombros) a partir da qual a mão conta como no espaço neutro. */
export const NEUTRAL_DISTANCE = 0.22;
const TEMPERATURE = 0.04;

/** Pontos da mão que costumam fazer o contato: pontas, meio dos dedos e centro da palma. */
const CONTACT_POINTS = [4, 8, 12, 16, 20, 6, 10] as const;

export interface BodyFrame {
  origin: Vec2;
  /** Largura dos ombros em pixels. */
  unit: number;
  /** Converte um ponto normalizado da imagem (já desespelhado) para coordenadas do corpo. */
  toBody(p: Vec3 | Vec2): Vec2;
}

export function bodyFrameOf(pose: CapturedPose | undefined, size: { width: number; height: number }): BodyFrame | null {
  if (!pose) return null;
  const vis = pose.visibility;
  if (vis[POSE_LM.LEFT_SHOULDER] < 0.5 || vis[POSE_LM.RIGHT_SHOULDER] < 0.5) return null;
  const px = (p: Vec3 | Vec2): Vec2 => [p[0] * size.width, p[1] * size.height];
  const l = px(pose.image[POSE_LM.LEFT_SHOULDER]);
  const r = px(pose.image[POSE_LM.RIGHT_SHOULDER]);
  const unit = Math.hypot(l[0] - r[0], l[1] - r[1]);
  if (unit < 1e-6) return null;
  const origin: Vec2 = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2];
  return {
    origin,
    unit,
    // Câmera comum: a direita de quem sinaliza aparece à esquerda da imagem
    toBody: (p) => {
      const q = px(p);
      return [(origin[0] - q[0]) / unit, (origin[1] - q[1]) / unit];
    },
  };
}

const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function palmCenter(points: Vec2[]): Vec2 {
  const ids = [HAND_LM.WRIST, HAND_LM.INDEX[0], HAND_LM.MIDDLE[0], HAND_LM.RING[0], HAND_LM.PINKY[0]];
  const sum = ids.reduce<Vec2>((acc, i) => add(acc, points[i]), [0, 0]);
  return [sum[0] / ids.length, sum[1] / ids.length];
}

/**
 * Âncoras de cada Local medível, em coordenadas do corpo. Um Local pode ter mais de
 * um ponto (os dois olhos, as duas orelhas); vale o mais próximo.
 */
export function locationAnchors(
  pose: CapturedPose,
  body: BodyFrame,
  side: HandSide,
  otherHand?: Vec2[]
): Map<number, Vec2[]> {
  const P = (i: number) => body.toBody(pose.image[i]);
  const seen = (i: number) => pose.visibility[i] >= 0.5;
  const eyeL = P(POSE_LM.LEFT_EYE);
  const eyeR = P(POSE_LM.RIGHT_EYE);
  const earL = P(POSE_LM.LEFT_EAR);
  const earR = P(POSE_LM.RIGHT_EAR);
  const mouthL = P(POSE_LM.MOUTH_LEFT);
  const mouthR = P(POSE_LM.MOUTH_RIGHT);
  const eyes = mid(eyeL, eyeR);
  const mouth = mid(mouthL, mouthR);
  const up = sub(eyes, mouth); // da boca para os olhos: escala do rosto

  const a = new Map<number, Vec2[]>();
  a.set(18, [add(eyes, up, 2.6)]);
  // Lateral da cabeça: acima e para fora da orelha (perto dela fica a têmpora, que é testa)
  a.set(19, [add(add(earL, sub(earL, eyes), 0.35), up, 1.0), add(add(earR, sub(earR, eyes), 0.35), up, 1.0)]);
  a.set(20, [earL, earR]);
  a.set(21, [add(eyes, up, 1.3), add(eyeL, up, 1.2), add(eyeR, up, 1.2)]);
  a.set(22, [add(eyeL, up, 0.45), add(eyeR, up, 0.45)]);
  a.set(23, [eyeL, eyeR]);
  a.set(24, [add(lerp(eyeL, earL, 0.3), up, -0.5), add(lerp(eyeR, earR, 0.3), up, -0.5)]);
  a.set(25, [P(POSE_LM.NOSE)]);
  a.set(27, [mouth]);
  a.set(29, [lerp(mouthL, earL, 0.5), lerp(mouthR, earR, 0.5)]);
  a.set(30, [add(mouth, up, -0.75)]);
  a.set(31, [add(mouth, up, -1.25)]);
  a.set(32, [mid(add(mouth, up, -1.4), [0, 0])]);
  a.set(34, [[0, -0.55]]);
  const hipsSeen = seen(POSE_EXTRA.LEFT_HIP) && seen(POSE_EXTRA.RIGHT_HIP);
  a.set(35, [hipsSeen ? lerp([0, 0], mid(P(POSE_EXTRA.LEFT_HIP), P(POSE_EXTRA.RIGHT_HIP)), 0.75) : [0, -1.25]]);
  const sideSign = side === 'right' ? 1 : -1;
  a.set(36, [[sideSign * 1.0, -0.6]]);

  // Membros do outro lado. Os do mesmo lado ficam de fora: o próprio punho e cotovelo
  // estão sempre perto da mão, e a mão erguida na frente do próprio ombro se sobrepõe
  // a ele na imagem sem tocá-lo.
  a.set(38, [P(side === 'right' ? POSE_LM.LEFT_SHOULDER : POSE_LM.RIGHT_SHOULDER)]);
  const otherElbow = side === 'right' ? POSE_EXTRA.LEFT_ELBOW : POSE_EXTRA.RIGHT_ELBOW;
  const otherWrist = side === 'right' ? POSE_LM.LEFT_WRIST : POSE_LM.RIGHT_WRIST;
  if (seen(otherElbow)) a.set(41, [P(otherElbow)]);
  if (seen(otherElbow) && seen(otherWrist)) a.set(42, [mid(P(otherElbow), P(otherWrist))]);
  if (seen(otherWrist)) a.set(43, [P(otherWrist)]);

  // Mão sobre mão: só quando a outra mão foi detectada
  if (otherHand) {
    a.set(45, [palmCenter(otherHand)]);
    a.set(47, [HAND_LM.INDEX[1], HAND_LM.MIDDLE[1], HAND_LM.RING[1], HAND_LM.PINKY[1]].map((i) => otherHand[i]));
    a.set(51, [HAND_LM.THUMB[3], HAND_LM.INDEX[3], HAND_LM.MIDDLE[3], HAND_LM.RING[3], HAND_LM.PINKY[3]].map((i) => otherHand[i]));
  }
  return a;
}

export interface LocationCandidate {
  id: number;
  char: string;
  label: string;
  /** Menor distância (largura dos ombros) entre a mão e a âncora. */
  distance: number;
  confidence: number;
}

export interface LocationMeasure {
  /** Centro da palma em coordenadas do corpo. */
  palm: Vec2;
  /** Ponto da mão mais próximo do Local sugerido, em coordenadas do corpo. */
  contact: Vec2;
  /** Índice do landmark da mão que fez esse contato. */
  contactLandmark: number;
  candidates: LocationCandidate[];
}

const LOCAL_INFO = new Map(ELIS_VISOGRAFEMAS.filter((v) => v.step === 4).map((v) => [v.id, v]));

export function measureLocation(
  frame: CaptureFrame,
  side: HandSide,
  size: { width: number; height: number }
): LocationMeasure | null {
  const hand = frame.hands.find((h) => h.side === side);
  const body = bodyFrameOf(frame.pose, size);
  if (!hand || !body || !frame.pose) return null;
  const toBody = (h: CapturedHand) => h.image.map((p) => body.toBody(p));
  const pts = toBody(hand);
  const other = frame.hands.find((h) => h.side !== side);
  const anchors = locationAnchors(frame.pose, body, side, other ? toBody(other) : undefined);
  const contacts = [...CONTACT_POINTS.map((i) => ({ i: i as number, p: pts[i] })), { i: -1, p: palmCenter(pts) }];

  const scored: { id: number; distance: number; contact: { i: number; p: Vec2 } }[] = [];
  for (const [id, targets] of anchors) {
    let best = { d: Infinity, c: contacts[0] };
    for (const t of targets) for (const c of contacts) {
      const d = dist(t, c.p);
      if (d < best.d) best = { d, c };
    }
    scored.push({ id, distance: best.d, contact: best.c });
  }
  const palm = palmCenter(pts);
  scored.push({ id: 33, distance: NEUTRAL_DISTANCE, contact: { i: -1, p: palm } });

  const weights = scored.map((s) => Math.exp(-s.distance / TEMPERATURE));
  const total = weights.reduce((x, y) => x + y, 0) || 1;
  const candidates = scored
    .map((s, k) => {
      const info = LOCAL_INFO.get(s.id);
      return {
        id: s.id,
        char: info?.char ?? '',
        label: info?.label ?? String(s.id),
        distance: s.distance,
        confidence: weights[k] / total,
        contact: s.contact,
      };
    })
    .sort((x, y) => x.distance - y.distance);
  const top = candidates[0];
  return {
    palm,
    contact: top.contact.p,
    contactLandmark: top.contact.i,
    candidates: candidates.map(({ contact: _contact, ...c }) => c),
  };
}
