# Protótipo do teclado ELiS com duas mãos 3D procedurais

- **Data:** 2026-11-11 a 2026-11-19 (entrada escrita em 2026-11-26 a partir do histórico do Git)
- **Etapa do cronograma:** anterior ao cronograma do pitch (protótipo)
- **Branch e commits:** `main`, de `e3a5b07` a `97acadf` (10 commits)
- **Arquivos principais:** `src/components/SelectorKeyboard.tsx`, `src/components/VisorArea.tsx`, `src/components/Hands3DCanvas.tsx`, `src/components/scene/BodyContextProps.ts`, `src/data/elisMap.ts`, `src/data/articulation3DMap.ts`

## Objetivo

Testar se a escrita ELiS pode ser montada num teclado de navegador, visografema por visografema, e se um modelo 3D das mãos consegue mostrar o sinal escrito.

## Como foi feito

1. Teclado seletor em cinco etapas, na ordem dos parâmetros da ELiS: polegar (6 visografemas), demais dedos (5), orientação da palma (6), ponto de articulação (35, em cabeça, tronco, membros e mão) e movimento (44). Os botões mostram os glifos da fonte `ELiS-Beta.otf`; o mapeamento glifo ↔ etapa ↔ rótulo dos 95 visografemas fica em `src/data/elisMap.ts`.
2. Visor que consolida o sinal ao escolher o quinto visografema e separa sinais com Espaço.
3. Duas mãos 3D montadas só com código em Three.js (sem arquivo `.glb`): punho, palma extrudada, polegar com três articulações e quatro dedos com três articulações cada. Cada visografema das etapas 1 a 3 vira um conjunto de ângulos.
4. Etapa 4: módulos de corpo (cabeça, tronco, braço, perna, mão de apoio) aparecem conforme o ponto de articulação, com um marcador luminoso no ponto. A posição de cada mão por ponto está em `src/data/articulation3DMap.ts`, ajustada à mão para não haver colisão.
5. Tecla Enter toca em loop os sinais escritos.

## Decisões

- Modelo procedural em vez de malha rigada do Blender: carrega instantaneamente, não depende de assets de terceiros e é fácil de depurar. As alternativas estão em `NOTAS_MODELO_3D.md`.
- Posições da etapa 4 escolhidas para legibilidade (mão ao lado do ponto, sem atravessar o corpo), não para fidelidade anatômica.

## Problemas e correções

Os commits `188fd48`, `e609cd1`, `a14c228`, `4bb3d1a` e `97acadf` corrigem, nesta ordem: a flexão do polegar e o enquadramento da câmera; a normal invertida da palma esquerda; o recorte de dedos horizontais em telas estreitas; o polegar atravessando a palma nos visografemas `w` e `q`; e a sobreposição das mãos nos pontos de membros e mão.

## Limitações

Todas as poses e posições foram ajustadas a olho, sem dado de referência de sinalização real. É esse o ponto que a pipeline de captura vai atacar.
