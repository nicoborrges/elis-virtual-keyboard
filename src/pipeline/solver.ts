/**
 * Solver: landmarks do MediaPipe → ângulos do rig procedural.
 *
 * Convenções (ver também src/components/scene/handRig.ts):
 * - Landmarks "world" do MediaPipe: x direita, y para baixo, z para longe da câmera.
 *   Na cena Three.js: x direita, y para cima, z para a câmera → (x, -y, -z).
 * - Frame anatômico da mão: +Y = punho → MCP do médio, +Z = normal da palma,
 *   +X = Y × Z (lado do polegar na mão direita, do mínimo na esquerda).
 * - O rig mostra a mão dominante (direita) à DIREITA da tela, como um espelho de
 *   quem sinaliza. Por isso a orientação do punho é espelhada no plano YZ
 *   (q → (x, -y, -z, w)) e o deslocamento horizontal é invertido. Assim "palma
 *   para a medial" (z) continua apontando para o centro e "para a direita" (mov.
 *   58) continua sendo a direita de quem sinaliza.
 *
 * Módulo sem DOM: roda no navegador e nos testes (Node).
 */
import * as THREE from 'three';
import type {
  CaptureFrame,
  CapturedHand,
  CapturedPose,
  CaptureSource,
  FingerAngles,
  HandSide,
  LandmarkCapture,
  Quat,
  SolvedFrame,
  SolvedHand,
  ThumbAngles,
  Vec3,
} from './types';

// ---------------------------------------------------------------------------
// Índices de landmarks
// ---------------------------------------------------------------------------

export const HAND_LM = {
  WRIST: 0,
  THUMB: [1, 2, 3, 4],
  INDEX: [5, 6, 7, 8],
  MIDDLE: [9, 10, 11, 12],
  RING: [13, 14, 15, 16],
  PINKY: [17, 18, 19, 20],
} as const;

export const FINGER_CHAINS = [HAND_LM.INDEX, HAND_LM.MIDDLE, HAND_LM.RING, HAND_LM.PINKY];

/** BlazePose (33 pontos). left/right são do corpo de quem sinaliza. */
export const POSE_LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const;

const POSE_MIRROR_PAIRS: [number, number][] = [
  [1, 4], [2, 5], [3, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16],
  [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
];

/** Largura dos ombros em unidades do rig (as mãos de repouso ficam em x = ±0.88). */
export const SHOULDER_WIDTH_RIG = 1.8;
/** Distância punho → MCP do médio no rig. */
export const PALM_LENGTH_RIG = 1.04;

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

export function worldToScene(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0], -p[1], -p[2]);
}

export function sceneToWorld(p: THREE.Vector3): Vec3 {
  return [p.x, -p.y, -p.z];
}

/** Espelha uma rotação no plano YZ (x → -x). Involução: aplicar 2x devolve a original. */
export function mirrorQuatX(q: THREE.Quaternion): THREE.Quaternion {
  return new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
}

export function sideSignOf(side: HandSide): 1 | -1 {
  return side === 'right' ? 1 : -1;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Ângulo de u para v com sinal dado pelo eixo (regra da mão direita). */
export function signedAngle(u: THREE.Vector3, v: THREE.Vector3, axis: THREE.Vector3): number {
  const cross = new THREE.Vector3().crossVectors(u, v);
  return Math.atan2(cross.dot(axis), u.dot(v));
}

// ---------------------------------------------------------------------------
// Frame da mão
// ---------------------------------------------------------------------------

/**
 * Orientação anatômica da mão (espaço da cena, sem espelhamento) a partir dos
 * 21 landmarks "world". `sideSign` = +1 mão direita, -1 esquerda.
 */
export function handFrameQuat(world: Vec3[], sideSign: 1 | -1): THREE.Quaternion {
  const pts = world.map(worldToScene);
  const wrist = pts[HAND_LM.WRIST];
  const y = pts[HAND_LM.MIDDLE[0]].clone().sub(wrist).normalize();
  const thumbSide = pts[HAND_LM.INDEX[0]].clone().sub(pts[HAND_LM.PINKY[0]]);
  const z = new THREE.Vector3().crossVectors(thumbSide, y).multiplyScalar(sideSign).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  z.crossVectors(x, y).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** Landmarks no espaço local do punho (mesma base do grupo `wrist` do rig). */
export function toLocal(world: Vec3[], frame: THREE.Quaternion): THREE.Vector3[] {
  const inv = frame.clone().invert();
  const pts = world.map(worldToScene);
  const wrist = pts[HAND_LM.WRIST].clone();
  return pts.map((p) => p.sub(wrist).applyQuaternion(inv));
}

// ---------------------------------------------------------------------------
// Dedos e polegar
// ---------------------------------------------------------------------------

/**
 * Resolve um dedo do rig: mcp.rotation = Euler(a, 0, c) ⇒ direção do segmento
 * proximal d1 = (-sin c, cos c·cos a, cos c·sin a).
 */
export function solveFinger(chain: THREE.Vector3[]): FingerAngles {
  const d1 = chain[1].clone().sub(chain[0]).normalize();
  const d2 = chain[2].clone().sub(chain[1]).normalize();
  const d3 = chain[3].clone().sub(chain[2]).normalize();
  const mcp = Math.atan2(d1.z, d1.y);
  const splay = Math.asin(clamp(-d1.x, -1, 1));
  const axis = new THREE.Vector3(
    Math.cos(splay),
    Math.sin(splay) * Math.cos(mcp),
    Math.sin(splay) * Math.sin(mcp)
  );
  return {
    mcp,
    pip: signedAngle(d1, d2, axis),
    dip: signedAngle(d2, d3, axis),
    splay,
  };
}

/**
 * Resolve o polegar: o CMC recebe uma rotação completa (Euler XYZ) que leva +Y ao
 * metacarpo e +Z ao plano de flexão; MCP e IP flexionam em torno do X local.
 */
export function solveThumb(chain: THREE.Vector3[]): ThumbAngles {
  const d1 = chain[1].clone().sub(chain[0]).normalize();
  const d2 = chain[2].clone().sub(chain[1]).normalize();
  const d3 = chain[3].clone().sub(chain[2]).normalize();

  // Plano de flexão do polegar inteiro (MCP + IP), robusto quando o MCP está quase reto
  let bend = d2
    .clone()
    .addScaledVector(d1, -d2.dot(d1))
    .add(d3.clone().addScaledVector(d1, -d3.dot(d1)));
  if (bend.length() < 1e-3) {
    // Polegar quase reto: usa a normal da palma como direção de flexão
    bend = new THREE.Vector3(0, 0, 1).addScaledVector(d1, -d1.z);
    if (bend.length() < 1e-4) bend = new THREE.Vector3(0, 1, 0).addScaledVector(d1, -d1.y);
  }
  const z = bend.normalize();
  const y = d1;
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');

  return {
    cmc: [e.x, e.y, e.z],
    mcp: signedAngle(d1, d2, x),
    ip: signedAngle(d2, d3, x),
  };
}

/** Ângulos do rig para uma mão capturada (sem deslocamento). */
export function solveHandPose(hand: CapturedHand): Omit<SolvedHand, 'offset'> {
  const sign = sideSignOf(hand.side);
  const frame = handFrameQuat(hand.world, sign);
  const local = toLocal(hand.world, frame);
  const rigQuat = mirrorQuatX(frame);
  return {
    wristQuat: [rigQuat.x, rigQuat.y, rigQuat.z, rigQuat.w] as Quat,
    thumb: solveThumb(HAND_LM.THUMB.map((i) => local[i])),
    fingers: FINGER_CHAINS.map((chain) => solveFinger(chain.map((i) => local[i]))),
  };
}

// ---------------------------------------------------------------------------
// Lado de cada mão (direita/esquerda de quem sinaliza)
// ---------------------------------------------------------------------------

export interface RawHandDetection {
  image: Vec3[];
  world: Vec3[];
  /** Rótulo do MediaPipe ("Left"/"Right"); na v1.2.3 já é a mão do sujeito. */
  label: string;
  score: number;
}

const dist2 = (a: Vec3, b: Vec3, w: number, h: number) =>
  ((a[0] - b[0]) * w) ** 2 + ((a[1] - b[1]) * h) ** 2;

/**
 * Decide o lado anatômico de cada mão detectada. Com esqueleto do corpo, usa o
 * punho do corpo mais próximo (robusto); sem ele, usa o rótulo do detector.
 * `mirroredInput`: true se a imagem já vier espelhada (câmera frontal "selfie").
 */
export function assignHandSides(
  hands: RawHandDetection[],
  pose: CapturedPose | undefined,
  size: { width: number; height: number },
  mirroredInput = false
): CapturedHand[] {
  const poseUsable =
    pose &&
    pose.visibility[POSE_LM.LEFT_WRIST] > 0.3 &&
    pose.visibility[POSE_LM.RIGHT_WRIST] > 0.3;

  if (poseUsable && hands.length > 0) {
    const rw = pose.image[POSE_LM.RIGHT_WRIST];
    const lw = pose.image[POSE_LM.LEFT_WRIST];
    const cost = hands.map((h) => ({
      right: dist2(h.image[0], rw, size.width, size.height),
      left: dist2(h.image[0], lw, size.width, size.height),
    }));
    let sides: HandSide[];
    if (hands.length === 1) {
      sides = [cost[0].right <= cost[0].left ? 'right' : 'left'];
    } else {
      const a = cost[0].right + cost[1].left;
      const b = cost[0].left + cost[1].right;
      sides = a <= b ? ['right', 'left'] : ['left', 'right'];
    }
    return hands.slice(0, 2).map((h, i) => toCaptured(h, sides[i], 'pose'));
  }

  let sides = hands.map((h): HandSide => {
    const isRight = h.label.toLowerCase().startsWith('right');
    return isRight !== mirroredInput ? 'right' : 'left';
  });
  if (hands.length >= 2 && sides[0] === sides[1]) {
    // Rótulos repetidos: em imagem não espelhada, a mão direita aparece à esquerda da imagem
    const rightIsFirst = (hands[0].image[0][0] < hands[1].image[0][0]) !== mirroredInput;
    sides = rightIsFirst ? ['right', 'left'] : ['left', 'right'];
  }
  return hands.slice(0, 2).map((h, i) => toCaptured(h, sides[i], 'handedness'));
}

function toCaptured(h: RawHandDetection, side: HandSide, sideSource: CapturedHand['sideSource']): CapturedHand {
  return { side, sideSource, score: h.score, image: h.image, world: h.world };
}

// ---------------------------------------------------------------------------
// Espelhamento (sinalizantes canhotos são processados como destros espelhados)
// ---------------------------------------------------------------------------

export function mirrorCapture(capture: LandmarkCapture): LandmarkCapture {
  const mirrorImage = (p: Vec3): Vec3 => [1 - p[0], p[1], p[2]];
  const mirrorWorld = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
  return {
    ...capture,
    frames: capture.frames.map((f) => ({
      t: f.t,
      hands: f.hands.map((h) => ({
        ...h,
        side: h.side === 'right' ? 'left' : 'right',
        image: h.image.map(mirrorImage),
        world: h.world.map(mirrorWorld),
      })),
      pose: f.pose ? mirrorPose(f.pose) : undefined,
    })),
  };

  function mirrorPose(p: CapturedPose): CapturedPose {
    const image = p.image.map(mirrorImage);
    const visibility = [...p.visibility];
    for (const [a, b] of POSE_MIRROR_PAIRS) {
      [image[a], image[b]] = [image[b], image[a]];
      [visibility[a], visibility[b]] = [visibility[b], visibility[a]];
    }
    return { image, visibility };
  }
}

// ---------------------------------------------------------------------------
// Captura inteira → frames do rig
// ---------------------------------------------------------------------------

function normalizationPx(frame: CaptureFrame, hand: CapturedHand, src: CaptureSource) {
  const pose = frame.pose;
  if (
    pose &&
    pose.visibility[POSE_LM.LEFT_SHOULDER] > 0.5 &&
    pose.visibility[POSE_LM.RIGHT_SHOULDER] > 0.5
  ) {
    const d = Math.sqrt(dist2(pose.image[POSE_LM.LEFT_SHOULDER], pose.image[POSE_LM.RIGHT_SHOULDER], src.width, src.height));
    if (d > 1) return { px: d, rig: SHOULDER_WIDTH_RIG };
  }
  const palm = Math.sqrt(dist2(hand.image[HAND_LM.WRIST], hand.image[HAND_LM.MIDDLE[0]], src.width, src.height));
  return { px: Math.max(palm, 1), rig: PALM_LENGTH_RIG };
}

export interface SolveOptions {
  /** Mão dominante de quem sinaliza. Canhotos são espelhados para o rig. */
  dominantHand?: HandSide;
}

export function solveCapture(capture: LandmarkCapture, opts: SolveOptions = {}): SolvedFrame[] {
  const cap = opts.dominantHand === 'left' ? mirrorCapture(capture) : capture;
  const src = cap.source;
  const anchors: Partial<Record<HandSide, { x: number; y: number; px: number; rig: number }>> = {};

  return cap.frames.map((frame) => {
    const out: SolvedFrame = { t: frame.t };
    for (const hand of frame.hands) {
      if (!anchors[hand.side]) {
        const n = normalizationPx(frame, hand, src);
        anchors[hand.side] = {
          x: hand.image[HAND_LM.WRIST][0] * src.width,
          y: hand.image[HAND_LM.WRIST][1] * src.height,
          ...n,
        };
      }
      const a = anchors[hand.side]!;
      const dxPx = hand.image[HAND_LM.WRIST][0] * src.width - a.x;
      const dyPx = hand.image[HAND_LM.WRIST][1] * src.height - a.y;
      const k = a.rig / a.px;
      const solved: SolvedHand = {
        ...solveHandPose(hand),
        // Espelho horizontal (convenção do rig) e y da imagem para baixo → cena para cima
        offset: [-dxPx * k, -dyPx * k, 0],
      };
      if (hand.side === 'right') out.dominant = solved;
      else out.nonDominant = solved;
    }
    return out;
  });
}

/** Frame resolvido mais próximo do tempo t (para prévia sincronizada com o vídeo). */
export function frameAt<T extends { t: number }>(frames: T[], t: number): T | undefined {
  if (frames.length === 0) return undefined;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(frames[lo - 1].t - t) < Math.abs(frames[lo].t - t)) return frames[lo - 1];
  return frames[lo];
}
