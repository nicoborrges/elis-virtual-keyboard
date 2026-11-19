export type BodyContextType = 'head' | 'torso' | 'arm' | 'leg' | 'hand';

export interface Articulation3DConfig {
  /** ID canônico do visografema na Etapa 4 (17 a 51) */
  id: number;
  /** Qual módulo anatômico contextual exibir no entorno das mãos */
  propType: BodyContextType;
  /** Posição 3D [x, y, z] do marcador luminoso (Hotspot Beacon) */
  hotspotPos: [number, number, number];
  /** Escala opcional do anel do beacon (ex.: maior para rosto inteiro ou espaço neutro) */
  beaconScale?: number;
  /** Posição-alvo [x, y, z] da mão dominante (direita) sem colisão */
  rightHandPos: [number, number, number];
  /** Posição opcional da mão esquerda (quando atua como apoio ou espelho ajustado) */
  leftHandPos?: [number, number, number];
  /** Quando true, força a mão esquerda como referência/apoio (Membros e Mão) */
  forceLeftSupport?: boolean;
  /** Rotação específica [rx, ry, rz] da mão esquerda de apoio (ex.: mostrar dorso em #46) */
  leftSupportRot?: [number, number, number];
  /** Multiplicador suave da distância da câmera para enquadrar silhueta + mãos */
  cameraZScale: number;
  /** Mostrar anel do espaço neutro (#33) */
  showNeutralSpaceRing?: boolean;
}

/**
 * Mapeamento espacial 3D dos 35 Pontos de Articulação (Etapa 4 — Grupo 3, IDs 17 a 51)
 * calibrado para manter as mãos livres de colisão e 100% enquadradas no palco WebGL.
 */
export const ARTICULATION_3D_MAP: Record<number, Articulation3DConfig> = {
  // =====================================================
  // CABEÇA (#17 a #31) — Cabeça sólida central em (0, 0.25, -0.95)
  // =====================================================
  17: {
    // Rosto
    id: 17,
    propType: 'head',
    hotspotPos: [0, 0.28, -0.26],
    beaconScale: 2.1,
    rightHandPos: [0.95, 0.08, 0.28],
    leftHandPos: [-0.95, 0.08, 0.28],
    cameraZScale: 1.2,
  },
  18: {
    // Alto da cabeça
    id: 18,
    propType: 'head',
    hotspotPos: [0, 1.04, -0.88],
    beaconScale: 1.2,
    rightHandPos: [0.85, 0.72, 0.18],
    leftHandPos: [-0.85, 0.72, 0.18],
    cameraZScale: 1.24,
  },
  19: {
    // Lateral da cabeça
    id: 19,
    propType: 'head',
    hotspotPos: [0.56, 0.56, -0.78],
    beaconScale: 1.0,
    rightHandPos: [1.08, 0.34, 0.14],
    leftHandPos: [-1.08, 0.34, 0.14],
    cameraZScale: 1.22,
  },
  20: {
    // Orelha
    id: 20,
    propType: 'head',
    hotspotPos: [0.62, 0.28, -0.88],
    beaconScale: 0.95,
    rightHandPos: [1.1, 0.08, 0.12],
    leftHandPos: [-1.1, 0.08, 0.12],
    cameraZScale: 1.22,
  },
  21: {
    // Testa
    id: 21,
    propType: 'head',
    hotspotPos: [0, 0.68, -0.34],
    beaconScale: 1.05,
    rightHandPos: [0.82, 0.44, 0.28],
    leftHandPos: [-0.82, 0.44, 0.28],
    cameraZScale: 1.2,
  },
  22: {
    // Sobrancelha
    id: 22,
    propType: 'head',
    hotspotPos: [0.22, 0.5, -0.32],
    beaconScale: 0.85,
    rightHandPos: [0.86, 0.28, 0.28],
    leftHandPos: [-0.86, 0.28, 0.28],
    cameraZScale: 1.2,
  },
  23: {
    // Olho
    id: 23,
    propType: 'head',
    hotspotPos: [0.21, 0.37, -0.33],
    beaconScale: 0.85,
    rightHandPos: [0.86, 0.16, 0.28],
    leftHandPos: [-0.86, 0.16, 0.28],
    cameraZScale: 1.2,
  },
  24: {
    // Maçã do rosto
    id: 24,
    propType: 'head',
    hotspotPos: [0.31, 0.21, -0.38],
    beaconScale: 0.9,
    rightHandPos: [0.92, 0.02, 0.26],
    leftHandPos: [-0.92, 0.02, 0.26],
    cameraZScale: 1.2,
  },
  25: {
    // Nariz
    id: 25,
    propType: 'head',
    hotspotPos: [0, 0.21, -0.2],
    beaconScale: 0.85,
    rightHandPos: [0.78, 0.0, 0.32],
    leftHandPos: [-0.78, 0.0, 0.32],
    cameraZScale: 1.2,
  },
  26: {
    // Lábio superior
    id: 26,
    propType: 'head',
    hotspotPos: [0, 0.05, -0.31],
    beaconScale: 0.8,
    rightHandPos: [0.8, -0.14, 0.3],
    leftHandPos: [-0.8, -0.14, 0.3],
    cameraZScale: 1.2,
  },
  27: {
    // Boca
    id: 27,
    propType: 'head',
    hotspotPos: [0, -0.04, -0.3],
    beaconScale: 0.9,
    rightHandPos: [0.8, -0.22, 0.3],
    leftHandPos: [-0.8, -0.22, 0.3],
    cameraZScale: 1.2,
  },
  28: {
    // Dentes
    id: 28,
    propType: 'head',
    hotspotPos: [0, -0.04, -0.28],
    beaconScale: 0.8,
    rightHandPos: [0.82, -0.22, 0.32],
    leftHandPos: [-0.82, -0.22, 0.32],
    cameraZScale: 1.2,
  },
  29: {
    // Bochecha
    id: 29,
    propType: 'head',
    hotspotPos: [0.38, 0.06, -0.46],
    beaconScale: 0.95,
    rightHandPos: [0.98, -0.12, 0.22],
    leftHandPos: [-0.98, -0.12, 0.22],
    cameraZScale: 1.2,
  },
  30: {
    // Queixo
    id: 30,
    propType: 'head',
    hotspotPos: [0, -0.26, -0.35],
    beaconScale: 0.9,
    rightHandPos: [0.8, -0.42, 0.28],
    leftHandPos: [-0.8, -0.42, 0.28],
    cameraZScale: 1.2,
  },
  31: {
    // Abaixo do queixo
    id: 31,
    propType: 'head',
    hotspotPos: [0, -0.44, -0.48],
    beaconScale: 0.95,
    rightHandPos: [0.82, -0.58, 0.24],
    leftHandPos: [-0.82, -0.58, 0.24],
    cameraZScale: 1.2,
  },

  // =====================================================
  // TRONCO (#32 a #36) — Busto sólido central em (0, -0.25, -1.05)
  // =====================================================
  32: {
    // Pescoço
    id: 32,
    propType: 'torso',
    hotspotPos: [0, 0.72, -0.66],
    beaconScale: 1.0,
    rightHandPos: [0.84, 0.48, 0.22],
    leftHandPos: [-0.84, 0.48, 0.22],
    cameraZScale: 1.26,
  },
  33: {
    // Espaço neutro
    id: 33,
    propType: 'torso',
    hotspotPos: [0, 0.04, 0.14],
    beaconScale: 1.5,
    rightHandPos: [0.92, -0.12, 0.3],
    leftHandPos: [-0.92, -0.12, 0.3],
    cameraZScale: 1.26,
    showNeutralSpaceRing: true,
  },
  34: {
    // Tórax
    id: 34,
    propType: 'torso',
    hotspotPos: [0, 0.16, -0.42],
    beaconScale: 1.2,
    rightHandPos: [0.84, -0.06, 0.28],
    leftHandPos: [-0.84, -0.06, 0.28],
    cameraZScale: 1.26,
  },
  35: {
    // Abdômen
    id: 35,
    propType: 'torso',
    hotspotPos: [0, -0.52, -0.48],
    beaconScale: 1.2,
    rightHandPos: [0.84, -0.62, 0.28],
    leftHandPos: [-0.84, -0.62, 0.28],
    cameraZScale: 1.26,
  },
  36: {
    // Espaço ao lado do tronco
    id: 36,
    propType: 'torso',
    hotspotPos: [1.34, -0.06, -0.35],
    beaconScale: 1.2,
    rightHandPos: [1.36, -0.22, 0.22],
    leftHandPos: [-1.18, -0.22, 0.22],
    cameraZScale: 1.32,
  },

  // =====================================================
  // MEMBROS (#37 a #44) — Mão esquerda atua como apoio automático (sem colisão)
  // Braço esquerdo contextual de (-1.75, +0.64, -0.56) -> cotovelo (-1.50, -0.26, -0.34) -> punho (-0.92, -0.26, -0.20)
  // =====================================================
  37: {
    // Braço inteiro
    id: 37,
    propType: 'arm',
    hotspotPos: [-1.36, 0.08, -0.24],
    beaconScale: 1.65,
    rightHandPos: [0.88, 0.04, 0.28],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  38: {
    // Ombro
    id: 38,
    propType: 'arm',
    hotspotPos: [-1.75, 0.66, -0.38],
    beaconScale: 1.15,
    rightHandPos: [0.78, 0.54, 0.28],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  39: {
    // Axila
    id: 39,
    propType: 'arm',
    hotspotPos: [-1.54, 0.3, -0.42],
    beaconScale: 1.0,
    rightHandPos: [0.78, 0.24, 0.28],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  40: {
    // Braço (segmento superior)
    id: 40,
    propType: 'arm',
    hotspotPos: [-1.62, 0.16, -0.32],
    beaconScale: 1.05,
    rightHandPos: [0.8, 0.1, 0.28],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  41: {
    // Cotovelo
    id: 41,
    propType: 'arm',
    hotspotPos: [-1.5, -0.26, -0.16],
    beaconScale: 1.05,
    rightHandPos: [0.82, -0.28, 0.3],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  42: {
    // Antebraço
    id: 42,
    propType: 'arm',
    hotspotPos: [-1.2, -0.26, -0.08],
    beaconScale: 1.05,
    rightHandPos: [0.82, -0.22, 0.32],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  43: {
    // Punho
    id: 43,
    propType: 'arm',
    hotspotPos: [-0.92, -0.26, -0.02],
    beaconScale: 1.0,
    rightHandPos: [0.82, -0.2, 0.32],
    leftHandPos: [-0.82, -0.22, -0.18],
    forceLeftSupport: true,
    leftSupportRot: [0.06, 0.22, -0.42],
    cameraZScale: 1.32,
  },
  44: {
    // Perna
    id: 44,
    propType: 'leg',
    hotspotPos: [-0.36, -0.44, -0.04],
    beaconScale: 1.2,
    rightHandPos: [0.76, -0.34, 0.32],
    leftHandPos: [-1.18, 0.16, 0.18],
    forceLeftSupport: true,
    cameraZScale: 1.26,
  },

  // =====================================================
  // MÃO (#45 a #51) — Mão esquerda atua como mão-alvo de apoio (folga horizontal limpa)
  // =====================================================
  45: {
    // Palma da mão
    id: 45,
    propType: 'hand',
    hotspotPos: [-0.8, -0.14, 0.14],
    beaconScale: 1.05,
    rightHandPos: [0.8, -0.14, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.28, 0],
    cameraZScale: 1.08,
  },
  46: {
    // Dorso da mão (mão esquerda gira mostrando o dorso)
    id: 46,
    propType: 'hand',
    hotspotPos: [-0.8, -0.14, 0.12],
    beaconScale: 1.05,
    rightHandPos: [0.8, -0.14, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, Math.PI - 0.26, 0],
    cameraZScale: 1.08,
  },
  47: {
    // Dedos
    id: 47,
    propType: 'hand',
    hotspotPos: [-0.8, 0.64, 0.1],
    beaconScale: 1.2,
    rightHandPos: [0.8, 0.28, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.2, 0],
    cameraZScale: 1.1,
  },
  48: {
    // Lateral de dedo
    id: 48,
    propType: 'hand',
    hotspotPos: [-1.16, 0.64, 0.06],
    beaconScale: 0.85,
    rightHandPos: [0.8, 0.24, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.2, 0],
    cameraZScale: 1.1,
  },
  49: {
    // Intervalo entre dedos
    id: 49,
    propType: 'hand',
    hotspotPos: [-0.92, 0.52, 0.08],
    beaconScale: 0.8,
    rightHandPos: [0.8, 0.2, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.2, 0],
    cameraZScale: 1.1,
  },
  50: {
    // Articulação de dedo
    id: 50,
    propType: 'hand',
    hotspotPos: [-0.8, 0.72, 0.08],
    beaconScale: 0.85,
    rightHandPos: [0.8, 0.3, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.2, 0],
    cameraZScale: 1.1,
  },
  51: {
    // Ponta de dedo
    id: 51,
    propType: 'hand',
    hotspotPos: [-0.8, 1.18, 0.06],
    beaconScale: 0.85,
    rightHandPos: [0.8, 0.52, 0.24],
    leftHandPos: [-0.8, -0.16, -0.08],
    forceLeftSupport: true,
    leftSupportRot: [0.08, 0.2, 0],
    cameraZScale: 1.12,
  },
};
