/**
 * Formatos de dados da pipeline de captura (imagens/vídeos de Libras → rig 3D).
 *
 * Fonte da verdade: landmarks limpos (`LandmarkCapture`), independentes de engine.
 * Dados derivados: ângulos do rig procedural (`SolvedFrame`), recalculáveis a
 * qualquer momento a partir dos landmarks. Todos os arquivos têm `schema` + `version`.
 *
 * Nenhum formato guarda imagem ou vídeo — só números (privacidade / LGPD).
 */

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

/** Mão anatômica de quem sinaliza (não a do observador). */
export type HandSide = 'right' | 'left';

export interface CapturedHand {
  side: HandSide;
  /** Como o lado foi decidido: pelo esqueleto do corpo (mais confiável) ou pelo classificador de mão. */
  sideSource: 'pose' | 'handedness';
  score: number;
  /** 21 landmarks normalizados na imagem (x, y ∈ [0,1], y para baixo; z relativo ao punho). */
  image: Vec3[];
  /** 21 landmarks em metros, centrados na mão (x direita, y baixo, z para longe da câmera). */
  world: Vec3[];
}

export interface CapturedPose {
  /** 33 landmarks normalizados do corpo (BlazePose). */
  image: Vec3[];
  visibility: number[];
}

export interface CaptureFrame {
  /** Tempo em segundos desde o início da mídia. */
  t: number;
  hands: CapturedHand[];
  pose?: CapturedPose;
}

export interface CaptureSource {
  kind: 'image' | 'video';
  name: string;
  width: number;
  height: number;
  fps?: number;
  duration?: number;
}

export interface LandmarkCapture {
  schema: 'acme.landmarks';
  version: 1;
  source: CaptureSource;
  createdAt: string;
  detector: string;
  /** Pós-processamento já aplicado (suavização, preenchimento de falhas). */
  cleaning?: { smoothing: boolean; gapFillMaxFrames: number };
  frames: CaptureFrame[];
}

// ---------------------------------------------------------------------------
// Ângulos do rig procedural (src/components/scene/handRig.ts)
// ---------------------------------------------------------------------------

export interface FingerAngles {
  mcp: number;
  pip: number;
  dip: number;
  /** rotation.z do MCP (abertura lateral), já no lado da mão. */
  splay: number;
}

export interface ThumbAngles {
  /** Euler XYZ do CMC. */
  cmc: Vec3;
  mcp: number;
  ip: number;
}

export interface SolvedHand {
  /** Orientação do punho no espaço da cena (convenção do rig: mão dominante à direita da tela). */
  wristQuat: Quat;
  thumb: ThumbAngles;
  /** [indicador, médio, anelar, mínimo] */
  fingers: FingerAngles[];
  /** Deslocamento em unidades do rig relativo ao 1º frame em que a mão apareceu. */
  offset: Vec3;
}

export interface SolvedFrame {
  t: number;
  /** Mão do rig com sideSign +1 (dominante). */
  dominant?: SolvedHand;
  /** Mão do rig com sideSign -1 (não dominante). */
  nonDominant?: SolvedHand;
}

export interface SignClip {
  schema: 'acme.signclip';
  version: 1;
  meta: {
    /** Palavra em português (entrada do dicionário). */
    word: string;
    /** Sequência ELiS confirmada por humano (pode ficar vazia até a validação). */
    elis: string;
    author: string;
    notes: string;
    dominantHand: HandSide;
    trim: { start: number; end: number };
    validatedByLetras: boolean;
  };
  landmarks: LandmarkCapture;
  frames: SolvedFrame[];
}

// ---------------------------------------------------------------------------
// Calibração das poses canônicas dos visografemas (a partir de fotos)
// ---------------------------------------------------------------------------

/** Valores sempre na convenção da mão direita (sideSign = +1). */
export interface RigCalibration {
  schema: 'acme.rigcalibration';
  version: 1;
  thumb: Record<string, ThumbAngles & { samples: number }>;
  fingers: Record<string, { fingers: FingerAngles[]; samples: number }>;
  palm: Record<string, { wristEuler: Vec3; samples: number }>;
}
