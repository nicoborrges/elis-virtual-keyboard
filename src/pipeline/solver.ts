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
  /**
   * Rótulo do MediaPipe ("Left"/"Right") sobre a imagem como foi entregue ao
   * detector. Pela documentação da v1.2.3 é a mão do sujeito, e imagem espelhada
   * inverte. NÃO confirmado com filmagem real (num render do rig o rótulo saiu
   * invertido, mas palma e dorso do manequim são ambíguos). Por isso o corpo tem
   * prioridade, o Estúdio mostra a concordância e permite trocar D↔E.
   */
  label: string;
  score: number;
}

const dist2 = (a: Vec3, b: Vec3, w: number, h: number) =>
  ((a[0] - b[0]) * w) ** 2 + ((a[1] - b[1]) * h) ** 2;

/**
 * Decide o lado anatômico de cada mão detectada. Com esqueleto do corpo, usa o
 * punho do corpo mais próximo (robusto); sem ele, usa o rótulo do detector.
 *
 * As coordenadas de `hands` e `pose` já devem estar NÃO espelhadas (ver
 * `unmirrorDetection`). `mirroredInput` só diz como interpretar o rótulo, que se
 * refere à imagem original entregue ao detector.
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
    return hands.slice(0, 2).map((h, i) => toCaptured(h, sides[i], 'pose', mirroredInput));
  }

  let sides = hands.map((h) => labelSide(h.label, mirroredInput));
  if (hands.length >= 2 && sides[0] === sides[1]) {
    // Rótulos repetidos: em coordenadas não espelhadas, a mão direita fica à esquerda da imagem
    const rightIsFirst = hands[0].image[0][0] < hands[1].image[0][0];
    sides = rightIsFirst ? ['right', 'left'] : ['left', 'right'];
  }
  return hands.slice(0, 2).map((h, i) => toCaptured(h, sides[i], 'handedness', mirroredInput));
}

/** Lado anatômico segundo o rótulo do detector (ver nota em RawHandDetection.label). */
export function labelSide(label: string, mirroredInput: boolean): HandSide {
  const saysRight = label.toLowerCase().startsWith('right');
  return saysRight !== mirroredInput ? 'right' : 'left';
}

function toCaptured(h: RawHandDetection, side: HandSide, sideSource: CapturedHand['sideSource'], mirroredInput: boolean): CapturedHand {
  return { side, sideSource, labelSide: labelSide(h.label, mirroredInput), score: h.score, image: h.image, world: h.world };
}

/**
 * Quanto o rótulo do detector concordou com o esqueleto do corpo (só quadros com
 * corpo). Perto de 0% indica convenção de espelhamento invertida.
 */
export function labelAgreement(capture: LandmarkCapture): { agree: number; total: number } {
  let agree = 0;
  let total = 0;
  for (const f of capture.frames) {
    for (const h of f.hands) {
      if (h.sideSource !== 'pose' || !h.labelSide) continue;
      total++;
      if (h.labelSide === h.side) agree++;
    }
  }
  return { agree, total };
}

// ---------------------------------------------------------------------------
// Espelhamento (sinalizantes canhotos são processados como destros espelhados)
// ---------------------------------------------------------------------------

export const mirrorImagePoint = (p: Vec3): Vec3 => [1 - p[0], p[1], p[2]];
export const mirrorWorldPoint = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

/** Espelha o esqueleto do corpo: x da imagem e troca esquerda ↔ direita. */
export function mirrorPose(p: CapturedPose): CapturedPose {
  const image = p.image.map(mirrorImagePoint);
  const visibility = [...p.visibility];
  for (const [a, b] of POSE_MIRROR_PAIRS) {
    [image[a], image[b]] = [image[b], image[a]];
    [visibility[a], visibility[b]] = [visibility[b], visibility[a]];
  }
  return { image, visibility };
}

/**
 * Mídia espelhada (selfie): devolve as coordenadas como se a câmera não
 * espelhasse, para que toda a pipeline trabalhe num único referencial.
 */
export function unmirrorDetection(hands: RawHandDetection[], pose: CapturedPose | undefined) {
  return {
    hands: hands.map((h) => ({ ...h, image: h.image.map(mirrorImagePoint), world: h.world.map(mirrorWorldPoint) })),
    pose: pose ? mirrorPose(pose) : undefined,
  };
}

export function mirrorCapture(capture: LandmarkCapture): LandmarkCapture {
  return {
    ...capture,
    frames: capture.frames.map((f) => ({
      t: f.t,
      hands: f.hands.map((h) => ({
        ...h,
        side: h.side === 'right' ? 'left' : 'right',
        image: h.image.map(mirrorImagePoint),
        world: h.world.map(mirrorWorldPoint),
      })),
      pose: f.pose ? mirrorPose(f.pose) : undefined,
    })),
  };
}

/** Troca manualmente D ↔ E em todos os quadros (quando a detecção errou o lado). */
export function swapHandSides(capture: LandmarkCapture): LandmarkCapture {
  return {
    ...capture,
    frames: capture.frames.map((f) => ({
      ...f,
      hands: f.hands.map((h) => ({ ...h, side: h.side === 'right' ? 'left' : 'right', sideSource: 'manual' })),
    })),
  };
}

/**
 * Penalidade anatômica: dedos dobrando para trás nas articulações PIP/DIP (além
 * de ~11°). Com o lado da mão trocado, a flexão inverte de sinal e a penalidade
 * dispara — serve para avisar lado suspeito.
 */
export function flexionPenalty(hand: Omit<SolvedHand, 'offset'>): number {
  return hand.fingers.reduce((acc, f) => acc + Math.max(0, -f.pip - 0.2) + Math.max(0, -f.dip - 0.2), 0);
}

/** Quadros em que a mão ficaria bem mais plausível com o lado trocado. */
export function suspectSides(capture: LandmarkCapture): { suspect: number; total: number } {
  let suspect = 0;
  let total = 0;
  for (const f of capture.frames) {
    for (const h of f.hands) {
      total++;
      const asIs = flexionPenalty(solveHandPose(h));
      const swapped = flexionPenalty(solveHandPose({ ...h, side: h.side === 'right' ? 'left' : 'right' }));
      if (asIs > 0.6 && swapped < asIs * 0.4) suspect++;
    }
  }
  return { suspect, total };
}

/**
 * Estabiliza o lado de cada mão ao longo de um vídeo: rastreia cada mão pela
 * posição do punho entre quadros e decide o lado de cada trilha por votação
 * (corpo pesa mais que o rótulo; troca manual vence). Evita que o rótulo do
 * detector oscile D/E no meio do sinal.
 */
export function stabilizeSides(capture: LandmarkCapture): LandmarkCapture {
  if (capture.frames.length < 2) return capture;
  const { width, height } = capture.source;
  const diag = Math.hypot(width, height);
  type Track = { lastX: number; lastY: number; lastT: number; votes: Record<HandSide, number>; xs: number[]; members: [number, number][] };
  const tracks: Track[] = [];
  const weight = (h: CapturedHand) => (h.sideSource === 'manual' ? 100 : h.sideSource === 'pose' ? 3 : Math.max(0.1, h.score));

  capture.frames.forEach((f, fi) => {
    const taken = new Set<Track>();
    const order = f.hands.map((h, hi) => ({ h, hi }));
    for (const { h, hi } of order) {
      const x = h.image[HAND_LM.WRIST][0] * width;
      const y = h.image[HAND_LM.WRIST][1] * height;
      let best: Track | undefined;
      let bestD = Infinity;
      for (const t of tracks) {
        if (taken.has(t) || f.t - t.lastT > 0.5) continue;
        const d = Math.hypot(x - t.lastX, y - t.lastY) / diag;
        if (d < 0.2 && d < bestD) {
          best = t;
          bestD = d;
        }
      }
      if (!best) {
        best = { lastX: x, lastY: y, lastT: f.t, votes: { right: 0, left: 0 }, xs: [], members: [] };
        tracks.push(best);
      }
      taken.add(best);
      best.lastX = x;
      best.lastY = y;
      best.lastT = f.t;
      best.votes[h.side] += weight(h);
      best.xs.push(h.image[HAND_LM.WRIST][0]);
      best.members.push([fi, hi]);
    }
  });

  const sideOf = new Map<Track, HandSide>();
  for (const t of tracks) sideOf.set(t, t.votes.right >= t.votes.left ? 'right' : 'left');
  // Trilhas simultâneas com o mesmo lado: a mais à esquerda da imagem é a mão direita
  const meanX = (t: Track) => t.xs.reduce((a, b) => a + b, 0) / t.xs.length;
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const a = tracks[i];
      const b = tracks[j];
      if (sideOf.get(a) !== sideOf.get(b)) continue;
      const framesA = new Set(a.members.map(([fi]) => fi));
      if (!b.members.some(([fi]) => framesA.has(fi))) continue;
      const aIsRight = meanX(a) < meanX(b);
      sideOf.set(a, aIsRight ? 'right' : 'left');
      sideOf.set(b, aIsRight ? 'left' : 'right');
    }
  }

  const frames = capture.frames.map((f) => ({ ...f, hands: [...f.hands] }));
  for (const t of tracks) {
    const side = sideOf.get(t)!;
    for (const [fi, hi] of t.members) {
      // Corpo e troca manual já decidem o lado quadro a quadro: a votação só corrige o rótulo,
      // que oscila. Sem isso, quadros distantes (GIF de poses-chave) ligam mãos diferentes.
      if (frames[fi].hands[hi].sideSource !== 'handedness') continue;
      frames[fi].hands[hi] = { ...frames[fi].hands[hi], side };
    }
  }
  // Nunca deixar duas mãos do mesmo lado no mesmo quadro: volta ao lado original
  frames.forEach((f, fi) => {
    if (f.hands.length === 2 && f.hands[0].side === f.hands[1].side) frames[fi] = capture.frames[fi];
  });
  return { ...capture, frames };
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
