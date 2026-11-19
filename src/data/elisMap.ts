export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface VisografemaItem {
  /** Número canônico na tabela ELiS Decodificada (1 a 95) */
  id: number;
  /** Caractere exato mapeado na fonte ELiS-Beta.otf */
  char: string;
  /** Código Unicode hexadecimal para referência técnica */
  unicode: string;
  /** Nome descritivo do visografema (para acessibilidade/screen-readers e tooltip sutil) */
  label: string;
  /** Etapa do seletor (1 a 5) */
  step: StepNumber;
  /** Subcategoria opcional (para Etapas 4 e 5) */
  category?: string;
}

export interface StepDefinition {
  step: StepNumber;
  shortTitle: string;
  fullTitle: string;
  groupName: string;
  description: string;
  categories?: {
    id: string;
    label: string;
    count: number;
  }[];
}

export const ELIS_STEPS: StepDefinition[] = [
  {
    step: 1,
    shortTitle: 'Polegar',
    fullTitle: '1. Configuração do Polegar',
    groupName: 'Grupo 1 — Configuração de Dedos',
    description: 'Configuração do polegar',
  },
  {
    step: 2,
    shortTitle: 'Dedos',
    fullTitle: '2. Demais Dedos',
    groupName: 'Grupo 1 — Configuração de Dedos',
    description: 'Configuração dos demais dedos',
  },
  {
    step: 3,
    shortTitle: 'Palma',
    fullTitle: '3. Orientação da Palma',
    groupName: 'Grupo 2 — Orientações da Palma (6 visografemas)',
    description: 'Orientação da palma',
  },
  {
    step: 4,
    shortTitle: 'Local',
    fullTitle: '4. Ponto de Articulação',
    groupName: 'Grupo 3 — Pontos de Articulação (35 visografemas)',
    description: 'Ponto de articulação',
    categories: [
      { id: 'cabeca', label: 'Cabeça', count: 15 },
      { id: 'tronco', label: 'Tronco', count: 5 },
      { id: 'membros', label: 'Membros', count: 8 },
      { id: 'mao', label: 'Mão', count: 7 },
    ],
  },
  {
    step: 5,
    shortTitle: 'Mov.',
    fullTitle: '5. Movimento',
    groupName: 'Grupo 4 — Movimentos (44 visografemas)',
    description: 'Movimento do sinal',
    categories: [
      { id: 'braco', label: 'Braço', count: 20 },
      { id: 'dedos_punho', label: 'Dedos / Punho', count: 12 },
      { id: 'sem_maos', label: 'Sem Mãos', count: 12 },
    ],
  },
];

/**
 * Mapa completo dos 95 visografemas da escrita ELiS (Escrita das Línguas de Sinais)
 * extraído diretamente da tabela cmap da fonte ELiS-Beta.otf e documento ELiS Decodificada.
 */
export const ELIS_VISOGRAFEMAS: VisografemaItem[] = [
  // ==========================================
  // ETAPA 1: POLEGAR (Grupo 1 - 6 visografemas)
  // ==========================================
  { id: 1, char: 'q', unicode: 'U+0071', label: 'Polegar fechado', step: 1 },
  { id: 2, char: 'w', unicode: 'U+0077', label: 'Polegar na palma', step: 1 },
  { id: 3, char: 'e', unicode: 'U+0065', label: 'Polegar curvo', step: 1 },
  { id: 4, char: 'r', unicode: 'U+0072', label: 'Polegar tridimensional', step: 1 },
  { id: 5, char: 't', unicode: 'U+0074', label: 'Polegar horizontal', step: 1 },
  { id: 6, char: 'y', unicode: 'U+0079', label: 'Polegar vertical', step: 1 },

  // ==========================================
  // ETAPA 2: DEMAIS DEDOS (Grupo 1 - 5 visografemas)
  // ==========================================
  { id: 1, char: 'q', unicode: 'U+0071', label: 'Demais dedos fechados', step: 2 },
  { id: 7, char: 'u', unicode: 'U+0075', label: 'Demais dedos muito curvos', step: 2 },
  { id: 8, char: 'o', unicode: 'U+006F', label: 'Demais dedos curvos', step: 2 },
  { id: 9, char: 's', unicode: 'U+0073', label: 'Demais dedos inclinados', step: 2 },
  { id: 10, char: 'g', unicode: 'U+0067', label: 'Demais dedos estendidos', step: 2 },

  // ==========================================
  // ETAPA 3: ORIENTAÇÃO DA PALMA (Grupo 2 - 6 visografemas)
  // ==========================================
  { id: 11, char: 'l', unicode: 'U+006C', label: 'Palma para frente', step: 3 },
  { id: 12, char: 'ç', unicode: 'U+00E7', label: 'Palma para trás', step: 3 },
  { id: 13, char: 'z', unicode: 'U+007A', label: 'Palma para a medial', step: 3 },
  { id: 14, char: 'x', unicode: 'U+0078', label: 'Palma para a distal', step: 3 },
  { id: 15, char: 'c', unicode: 'U+0063', label: 'Palma para cima', step: 3 },
  { id: 16, char: 'v', unicode: 'U+0076', label: 'Palma para baixo', step: 3 },

  // ==========================================
  // ETAPA 4: PONTO DE ARTICULAÇÃO (Grupo 3 - 35 visografemas)
  // Subcategoria: Cabeça (17 a 31)
  // ==========================================
  { id: 17, char: 'Q', unicode: 'U+0051', label: 'Rosto', step: 4, category: 'cabeca' },
  { id: 18, char: 'W', unicode: 'U+0057', label: 'Alto da cabeça', step: 4, category: 'cabeca' },
  { id: 19, char: 'E', unicode: 'U+0045', label: 'Lateral da cabeça', step: 4, category: 'cabeca' },
  { id: 20, char: 'R', unicode: 'U+0052', label: 'Orelha', step: 4, category: 'cabeca' },
  { id: 21, char: 'T', unicode: 'U+0054', label: 'Testa', step: 4, category: 'cabeca' },
  { id: 22, char: 'Y', unicode: 'U+0059', label: 'Sobrancelha', step: 4, category: 'cabeca' },
  { id: 23, char: 'U', unicode: 'U+0055', label: 'Olho', step: 4, category: 'cabeca' },
  { id: 24, char: 'I', unicode: 'U+0049', label: 'Maçã do rosto', step: 4, category: 'cabeca' },
  { id: 25, char: 'O', unicode: 'U+004F', label: 'Nariz', step: 4, category: 'cabeca' },
  { id: 26, char: 'P', unicode: 'U+0050', label: 'Lábio superior', step: 4, category: 'cabeca' },
  { id: 27, char: 'A', unicode: 'U+0041', label: 'Boca', step: 4, category: 'cabeca' },
  { id: 28, char: 'S', unicode: 'U+0053', label: 'Dentes', step: 4, category: 'cabeca' },
  { id: 29, char: 'D', unicode: 'U+0044', label: 'Bochecha', step: 4, category: 'cabeca' },
  { id: 30, char: 'F', unicode: 'U+0046', label: 'Queixo', step: 4, category: 'cabeca' },
  { id: 31, char: 'G', unicode: 'U+0047', label: 'Abaixo do queixo', step: 4, category: 'cabeca' },

  // Subcategoria: Tronco (32 a 36)
  { id: 32, char: 'H', unicode: 'U+0048', label: 'Pescoço', step: 4, category: 'tronco' },
  { id: 33, char: 'J', unicode: 'U+004A', label: 'Espaço neutro', step: 4, category: 'tronco' },
  { id: 34, char: 'K', unicode: 'U+004B', label: 'Tórax', step: 4, category: 'tronco' },
  { id: 35, char: 'Ç', unicode: 'U+00C7', label: 'Abdômen', step: 4, category: 'tronco' },
  { id: 36, char: 'L', unicode: 'U+004C', label: 'Espaço ao lado do tronco', step: 4, category: 'tronco' },

  // Subcategoria: Membros (37 a 44)
  { id: 37, char: '\\', unicode: 'U+005C', label: 'Braço inteiro', step: 4, category: 'membros' },
  { id: 38, char: 'Z', unicode: 'U+005A', label: 'Ombro', step: 4, category: 'membros' },
  { id: 39, char: 'X', unicode: 'U+0058', label: 'Axila', step: 4, category: 'membros' },
  { id: 40, char: 'C', unicode: 'U+0043', label: 'Braço', step: 4, category: 'membros' },
  { id: 41, char: 'V', unicode: 'U+0056', label: 'Cotovelo', step: 4, category: 'membros' },
  { id: 42, char: 'B', unicode: 'U+0042', label: 'Antebraço', step: 4, category: 'membros' },
  { id: 43, char: 'N', unicode: 'U+004E', label: 'Punho', step: 4, category: 'membros' },
  { id: 44, char: 'M', unicode: 'U+004D', label: 'Perna', step: 4, category: 'membros' },

  // Subcategoria: Mão (45 a 51)
  { id: 45, char: '@', unicode: 'U+0040', label: 'Palma da mão', step: 4, category: 'mao' },
  { id: 46, char: '#', unicode: 'U+0023', label: 'Dorso da mão', step: 4, category: 'mao' },
  { id: 47, char: '$', unicode: 'U+0024', label: 'Dedos', step: 4, category: 'mao' },
  { id: 48, char: '%', unicode: 'U+0025', label: 'Lateral de dedo', step: 4, category: 'mao' },
  { id: 49, char: '&', unicode: 'U+0026', label: 'Intervalo entre dedos', step: 4, category: 'mao' },
  { id: 50, char: '*', unicode: 'U+002A', label: 'Articulação de dedo', step: 4, category: 'mao' },
  { id: 51, char: '_', unicode: 'U+005F', label: 'Ponta de dedo', step: 4, category: 'mao' },

  // ==========================================
  // ETAPA 5: MOVIMENTO (Grupo 4 - 44 visografemas)
  // Subcategoria: Movimentos de braço (52 a 71)
  // ==========================================
  { id: 52, char: 'à', unicode: 'U+00E0', label: 'Para frente', step: 5, category: 'braco' },
  { id: 53, char: 'á', unicode: 'U+00E1', label: 'Para trás', step: 5, category: 'braco' },
  { id: 54, char: 'â', unicode: 'U+00E2', label: 'Para frente e para trás', step: 5, category: 'braco' },
  { id: 55, char: 'ã', unicode: 'U+00E3', label: 'Para cima', step: 5, category: 'braco' },
  { id: 56, char: 'ä', unicode: 'U+00E4', label: 'Para baixo', step: 5, category: 'braco' },
  { id: 57, char: 'è', unicode: 'U+00E8', label: 'Para cima e para baixo', step: 5, category: 'braco' },
  { id: 58, char: 'é', unicode: 'U+00E9', label: 'Para a direita', step: 5, category: 'braco' },
  { id: 59, char: 'ê', unicode: 'U+00EA', label: 'Para a esquerda', step: 5, category: 'braco' },
  { id: 60, char: 'ë', unicode: 'U+00EB', label: 'Para a direita e esquerda', step: 5, category: 'braco' },
  { id: 61, char: 'ì', unicode: 'U+00EC', label: 'Para o meio', step: 5, category: 'braco' },
  { id: 62, char: 'í', unicode: 'U+00ED', label: 'Para fora', step: 5, category: 'braco' },
  { id: 63, char: 'î', unicode: 'U+00EE', label: 'Para cima e direita', step: 5, category: 'braco' },
  { id: 64, char: 'ï', unicode: 'U+00EF', label: 'Para cima e esquerda', step: 5, category: 'braco' },
  { id: 65, char: 'ò', unicode: 'U+00F2', label: 'Para baixo e direita', step: 5, category: 'braco' },
  { id: 66, char: 'ó', unicode: 'U+00F3', label: 'Para baixo e esquerda', step: 5, category: 'braco' },
  { id: 67, char: 'ô', unicode: 'U+00F4', label: 'Arco', step: 5, category: 'braco' },
  { id: 68, char: 'õ', unicode: 'U+00F5', label: 'Flexão/extensão do braço', step: 5, category: 'braco' },
  { id: 69, char: 'ö', unicode: 'U+00F6', label: 'Circular vertical', step: 5, category: 'braco' },
  { id: 70, char: 'ù', unicode: 'U+00F9', label: 'Circular horizontal', step: 5, category: 'braco' },
  { id: 71, char: 'ú', unicode: 'U+00FA', label: 'Circular frontal', step: 5, category: 'braco' },

  // Subcategoria: Movimentos de dedos ou punho (72 a 83)
  { id: 72, char: 'û', unicode: 'U+00FB', label: 'Abrir dedos', step: 5, category: 'dedos_punho' },
  { id: 73, char: 'ü', unicode: 'U+00FC', label: 'Fechar dedos', step: 5, category: 'dedos_punho' },
  { id: 74, char: 'À', unicode: 'U+00C0', label: 'Abrir e fechar dedos', step: 5, category: 'dedos_punho' },
  { id: 75, char: 'Á', unicode: 'U+00C1', label: 'Flexionar dedos na 1ª articulação', step: 5, category: 'dedos_punho' },
  { id: 76, char: 'Â', unicode: 'U+00C2', label: 'Flexionar dedos na 2ª articulação', step: 5, category: 'dedos_punho' },
  { id: 77, char: 'Ã', unicode: 'U+00C3', label: 'Unir e separar os dedos', step: 5, category: 'dedos_punho' },
  { id: 78, char: 'Ä', unicode: 'U+00C4', label: 'Tamborilar de dedos', step: 5, category: 'dedos_punho' },
  { id: 79, char: 'È', unicode: 'U+00C8', label: 'Friccionar de dedos', step: 5, category: 'dedos_punho' },
  { id: 80, char: 'É', unicode: 'U+00C9', label: 'Dobrar o punho', step: 5, category: 'dedos_punho' },
  { id: 81, char: 'Ê', unicode: 'U+00CA', label: 'Mover o punho lateralmente', step: 5, category: 'dedos_punho' },
  { id: 82, char: 'Ë', unicode: 'U+00CB', label: 'Girar o punho', step: 5, category: 'dedos_punho' },
  { id: 83, char: 'Ì', unicode: 'U+00CC', label: 'Girar o antebraço', step: 5, category: 'dedos_punho' },

  // Subcategoria: Movimentos sem as mãos / Expressão facial (84 a 95)
  { id: 84, char: 'Í', unicode: 'U+00CD', label: 'Negação com a cabeça', step: 5, category: 'sem_maos' },
  { id: 85, char: 'Î', unicode: 'U+00CE', label: 'Afirmação com a cabeça', step: 5, category: 'sem_maos' },
  { id: 86, char: 'Ï', unicode: 'U+00CF', label: 'Língua na bochecha', step: 5, category: 'sem_maos' },
  { id: 87, char: 'Ò', unicode: 'U+00D2', label: 'Língua para fora', step: 5, category: 'sem_maos' },
  { id: 88, char: 'Ó', unicode: 'U+00D3', label: 'Corrente de ar', step: 5, category: 'sem_maos' },
  { id: 89, char: 'Ô', unicode: 'U+00D4', label: 'Vibração dos lábios', step: 5, category: 'sem_maos' },
  { id: 90, char: 'Õ', unicode: 'U+00D5', label: 'Movimento lateral do queixo', step: 5, category: 'sem_maos' },
  { id: 91, char: 'Ö', unicode: 'U+00D6', label: 'Murchar bochechas', step: 5, category: 'sem_maos' },
  { id: 92, char: 'Ù', unicode: 'U+00D9', label: 'Inflar bochechas', step: 5, category: 'sem_maos' },
  { id: 93, char: 'Ú', unicode: 'U+00DA', label: 'Boca aberta', step: 5, category: 'sem_maos' },
  { id: 94, char: 'Û', unicode: 'U+00DB', label: 'Piscar os olhos', step: 5, category: 'sem_maos' },
  { id: 95, char: 'Ü', unicode: 'U+00DC', label: 'Girar o tronco', step: 5, category: 'sem_maos' },
];

export function getVisografemasByStep(step: StepNumber, category?: string): VisografemaItem[] {
  return ELIS_VISOGRAFEMAS.filter(
    (item) => item.step === step && (!category || item.category === category)
  );
}
