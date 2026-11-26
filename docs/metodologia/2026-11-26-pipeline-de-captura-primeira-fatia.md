# Pipeline de captura, primeira fatia: fotos e vídeos de Libras para o rig 3D

- **Data:** 2026-11-26
- **Etapa do cronograma:** Dez 2026 (mecânica base); alimenta a animação dos sinais
- **Branch e commits:** `feat/pipeline-captura`, `aa9200e` (extração do rig), `e7d012f` (núcleo e testes), `00ca2dd` (Estúdio de Captura), `cb41473` (correções após teste no navegador)
- **Arquivos principais:** `src/pipeline/`, `src/studio/`, `src/components/scene/handRig.ts`, `estudio.html`, `vite.config.ts`, `docs/pipeline-captura.md`

## Objetivo

Começar a pipeline que melhora o modelo 3D das mãos a partir de material real de Libras: medir a mão em fotos e vídeos, converter a medida nos ângulos do rig procedural e usar o resultado para corrigir as poses dos visografemas e gerar animações de palavras.

## Como foi feito

1. **Rig compartilhado.** Movemos o rig procedural de `Hands3DCanvas.tsx` para `src/components/scene/handRig.ts`, para que o teclado e o estúdio usem a mesma geometria e as mesmas poses (`getPoseFromElis`).
2. **Detecção no navegador.** MediaPipe Tasks Vision 1.2.3: HandLandmarker (21 pontos por mão, em pixels e em metros) e PoseLandmarker *full* (33 pontos do corpo). GPU com volta para CPU. A mídia não sai da máquina.
3. **Lado das mãos.** O punho do esqueleto do corpo mais próximo decide se a mão é direita ou esquerda. Sem corpo, vale o rótulo do detector. Em vídeo, cada mão é rastreada entre quadros (distância do punho menor que 0,2 da diagonal, janela de 0,5 s) e o lado é decidido por votação (pesos: troca manual 100, corpo 3, rótulo igual ao score).
4. **Limpeza (vídeo).** Preenchimento de ausências de até 4 quadros e filtro One Euro (minCutoff 1,5; beta 0,3).
5. **Solver.** Converte os pontos em ângulos do rig: orientação do punho por quaternion, polegar com rotação completa na base (CMC) mais MCP e IP, cada dedo com MCP, PIP, DIP e abertura. Deslocamento do punho normalizado pela largura dos ombros (ou pelo comprimento da palma, sem corpo). O rig mostra a mão dominante à direita da tela, então a orientação é espelhada no plano YZ.
6. **Sugestão ELiS.** Compara as direções dos segmentos da mão medida com as poses canônicas do teclado (cinemática direta) e ranqueia os visografemas de polegar, dedos e palma (softmax com τ = 0,12).
7. **Saídas.** Calibração (média das amostras por visografema, em `src/data/rigCalibration.json`) e clipe de sinal (`src/data/clips/<palavra>.json`). Os pontos limpos são a fonte da verdade (`acme.landmarks` v1); os ângulos são dados derivados.
8. **Estúdio de Captura** (`/estudio.html`), uma entrada separada do Vite para o MediaPipe não entrar no bundle do teclado.

## Decisões

- Rodar a detecção no navegador, e não em Python, para a monitora da Letras usar sem instalar nada e para a mídia não sair da máquina.
- Guardar pontos, e não ângulos, como fonte da verdade: um solver melhor no futuro pode reprocessar tudo.
- O corpo tem prioridade sobre o rótulo de mão do detector, porque o rótulo oscilou entre quadros nos testes.

## Resultados e evidências

- 19 testes automatizados (`npm test`), incluindo ida e volta rig → pontos sintéticos → solver para todas as poses de polegar, dedos e palma nas duas mãos.
- Fixture com saída real do MediaPipe sobre um render do rig (mão direita, `t g l`): sugestões polegar `t` 100%, dedos `g` 100%, palma `l` 99%.
- Vídeo gravado no navegador a partir do rig: 67 de 67 quadros com o lado certo depois da estabilização; deslocamento coerente com o movimento.
- Bundle do teclado sem mudança relevante; o MediaPipe ficou só no chunk do estúdio (194 kB).
- Clipe: cerca de 65 kB por segundo em JSON compacto.

## Problemas e correções

- Vídeos gravados no navegador informavam duração infinita: forçamos o cálculo buscando um tempo enorme (`finiteDuration`).
- O rótulo de mão oscilava entre D e E no mesmo vídeo e deslocava a âncora do deslocamento: criamos `stabilizeSides`.
- A opção "mídia espelhada" não afetava o caminho pelo corpo: passamos a desespelhar as coordenadas antes de decidir o lado.
- Uma amostra de calibração tirada do manequim piorou a pose do polegar no teclado. Revertemos e passamos a exigir revisão da calibração no PR.

## Limitações

- Testado só com o próprio rig renderizado. O MediaPipe lê o manequim de forma imprecisa (detectou 1 de 5 renders).
- A convenção do rótulo de mão do MediaPipe não foi confirmada com mãos humanas.
- Ponto de articulação (etapa 4), movimento (etapa 5) e proporções da mão ainda não são medidos.
