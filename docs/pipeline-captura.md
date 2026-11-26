# Pipeline de captura — fotos e vídeos de Libras → rig 3D

> **Status (2026-11-26):** funcionando no **Estúdio de Captura** (`/estudio.html`). Primeiro teste com mãos humanas: os 13 GIFs de cumprimentos do IFPR (45 mãos em 40 quadros). O corpo decidiu o lado de todas, conferido visualmente em 23 quadros, e o rótulo do detector concordou com o corpo em 100%. Configuração de mão, ponto de articulação e proporções foram medidos, mas **nenhuma sugestão ELiS foi conferida contra uma escrita de referência**: falta a escrita ELiS validada dessas palavras.

## 1. Para que serve

A pipeline é um **ciclo de melhoria** do modelo 3D: material de referência em Libras → medir → comparar com o que o rig faz para cada visografema → corrigir o rig → registrar no [diário de metodologia](metodologia/README.md). Cada volta do ciclo deixa o modelo mais fiel em quatro frentes:

| Frente | O que se mede | Estado |
|---|---|---|
| **Configuração da mão** (etapas 1–3: polegar, dedos, palma) | Ângulos de cada articulação e orientação do punho | Medida e calibrável (`src/data/rigCalibration.json`) |
| **Posicionamento** (etapa 4: ponto de articulação) | Posição da mão em relação ao corpo (rosto, tronco, outro braço, outra mão) | Medida e sugerida; ainda não aplicada ao teclado |
| **Animação** (etapa 5 e palavras inteiras) | Trajetória e ângulos ao longo do tempo | Clipes de vídeo (`src/data/clips/`); movimento ainda não classificado |
| **Modelagem** (geometria da mão) | Comprimento de cada falange e largura da palma | Medida e comparada com o rig; ainda não aplicada |

Entradas aceitas:

| Entrada | Uso principal |
|---|---|
| **Foto** de um visografema isolado | Amostra de calibração da configuração |
| **Vídeo** de uma palavra | Clipe de animação e trajetória |
| **GIF de poses-chave** (ex.: [IFPR Libras GIFs](https://ifpr.edu.br/umuarama/libras-gifs/)) | Configuração, ponto de articulação e proporções. Não serve para clipe: são 2 a 9 quadros de 0,4 s, sem o movimento entre eles |

## 2. Etapas

```
mídia ──► detecção ──► lado das mãos ──► limpeza ──► solver ──► sugestão ELiS ──► calibração / clipe
          MediaPipe     corpo > rótulo    One Euro    ângulos     polegar, dedos,
          mãos + corpo                    + falhas    do rig      palma
```

1. **Detecção** (`src/studio/detector.ts`): MediaPipe Tasks Vision 1.2.3 no navegador. Retorna 21 pontos por mão (na imagem e em metros) e 33 pontos do corpo (opcional). **A mídia não sai da máquina.** GIF animado é lido quadro a quadro com `ImageDecoder` (`src/studio/gifSource.ts`, Chrome e Edge) e cada quadro é detectado como foto independente.
2. **Lado das mãos** (`assignHandSides`): usa o punho do esqueleto do corpo mais próximo. Sem corpo, usa o rótulo do detector. Mídia espelhada é desespelhada antes, nas coordenadas.
3. **Limpeza** (`stabilizeSides` + `filter.ts`; GIF de poses-chave só passa pela estabilização do lado):
   - rastreia cada mão entre os quadros e decide o lado por votação, porque o rótulo do detector oscila D/E;
   - preenche ausências de até 4 quadros;
   - suaviza com filtro One Euro.
4. **Solver** (`solver.ts`): converte os pontos nos ângulos do rig procedural:
   - punho: orientação 3D;
   - polegar: CMC completo, mais MCP e IP;
   - cada dedo: MCP, PIP, DIP e abertura lateral;
   - deslocamento do punho, normalizado pela largura dos ombros.
5. **Sugestão ELiS** (`classify.ts`): compara a mão com as poses canônicas do teclado e ranqueia polegar (6), dedos (5) e palma (6).
6. **Ponto de articulação** (`location.ts`): monta âncoras de 23 Locais (mais o espaço neutro) a partir do esqueleto do corpo (olhos, boca, orelhas, ombros, quadril, braço e mão do outro lado) e mede a menor distância até as pontas dos dedos, o meio dos dedos e o centro da palma, em larguras de ombro. Acima de 0,22 a mão conta como espaço neutro. Ficam de fora os Locais que o esqueleto 2D não separa: 17 rosto, 26 lábio superior, 28 dentes, 37 braço inteiro, 39 axila, 40 braço, 44 perna, 46 dorso da mão e 48–50.
7. **Proporções** (`proportions.ts`): cada falange dividida pelo comprimento da palma (punho → base do dedo médio), mediana de todas as mãos com score ≥ 0,8, comparada com a mão do rig em repouso.
8. **Saídas** (`calibration.ts`, Estúdio): média de amostras de calibração; clipe com recorte, metadados e status de validação.

## 3. Como usar

```bash
npm run dev
# abra http://localhost:5173/estudio.html
```

1. Arraste uma foto ou um vídeo. Também aceita um JSON de landmarks ou de clipe, para reprocessar sem a mídia.
2. Clique em **Extrair landmarks**.
3. **Confira a sobreposição:** "D" (dourado) deve estar na mão **direita** de quem sinaliza e "E" (vinho) na esquerda.
   - Se estiver trocado, clique em **Trocar D↔E**.
   - Se a mídia veio de câmera frontal espelhada, marque **Mídia espelhada** e extraia de novo.
   - O status avisa quando não há corpo no quadro e quando os dedos parecem dobrar para trás (sinal de lado trocado).
4. **Fotos → calibração:**
   - escolha a etapa (Polegar, Dedos ou Palma) e o visografema;
   - clique em **Adicionar amostra** (de 3 a 5 fotos por visografema é um bom começo);
   - clique em **Salvar no repositório**.
   - **Inclua os ombros na foto.** Sem o corpo, o lado da mão depende só do rótulo do detector.
   - Confira a sugestão antes de adicionar. Uma amostra ruim **piora** a pose no teclado; foi o que aconteceu no teste com o manequim.
   - Revise o diff de `rigCalibration.json` no PR.
5. **Vídeos → clipe:**
   - preencha a palavra, a escrita ELiS e o autor;
   - marque o início e o fim;
   - clique em **Salvar clipe no repositório**.
   - Só marque **Validado pela Letras-UFG** depois da revisão da equipe.
6. Faça o commit dos JSON gerados.

"Salvar no repositório" só funciona no `npm run dev`, por um endpoint que aceita apenas `src/data/rigCalibration.json` e `src/data/clips/*.json`. Fora dele, o arquivo é baixado.

## 4. Guia de gravação (para a monitora)

- Câmera **parada**, de frente, na altura do peito. **Não espelhar** a gravação (a câmera traseira ou uma webcam comum já gravam sem espelho).
- Enquadrar da cintura até acima da cabeça, com as duas mãos sempre dentro do quadro.
- Luz uniforme, de frente, e fundo liso, que contraste com a pele. Roupa lisa de manga longa ajuda.
- **Um sinal por vídeo**, começando e terminando com as mãos em repouso.
- 30 quadros/s ou mais. Resolução de 720p já basta.
- **Fotos de calibração:** um visografema por foto, com a mão a cerca de 40–60 cm da câmera e a palma bem visível (exceto quando a orientação pede o contrário).
- Nome do arquivo: `palavra_AAAAMMDD_tomada.mp4`, **sem nome de pessoa**. O nome do arquivo vai para o JSON.
- Guarde os originais em `capturas/`, que está **fora do Git** (dados pessoais; ver [plano de ética/LGPD](plano-etica-lgpd.md)).

### Material de terceiros (GIFs do IFPR)

- Baixe para `capturas/ifpr/<categoria>/` com um `FONTE.txt` (URL, data de acesso, licença). Os GIFs mostram pessoas identificáveis e a página **não declara licença**: use só como referência local de pesquisa, sem versionar nem redistribuir.
- No campo autor do clipe, escreva a fonte ("IFPR Campus Umuarama, Libras GIFs"), nunca o nome de quem sinaliza.
- Sinais do IFPR não são validados pela Letras-UFG e podem ter variação regional (Paraná). Servem para medir o detector, o posicionamento e as proporções, não para entrar no dicionário.

## 5. Formatos

Definidos em `src/pipeline/types.ts`. Todo arquivo traz `schema` e `version`:

- `acme.landmarks` v1: **fonte da verdade**. São os pontos limpos de cada quadro, independentes de engine, e servem de base para reprocessar com um solver melhor no futuro.
- `acme.signclip` v1: os landmarks recortados, os ângulos do rig (dados derivados) e os metadados (palavra, ELiS, autor, mão dominante, recorte, validação).
- `acme.rigcalibration` v1: as poses médias por visografema, sempre na convenção da mão direita.

Nenhum desses arquivos guarda imagem, mas eles guardam o **nome do arquivo de origem** e o campo **autor**. No autor, use a função (por exemplo, "monitora Letras-UFG"), não o nome da pessoa. Um clipe ocupa cerca de **65 kB por segundo** (JSON compacto, 30 quadros/s, com corpo).

## 6. Convenções importantes

- **Rig espelhado:** o teclado mostra a mão dominante à **direita da tela**, como um espelho de quem sinaliza. Por isso o solver espelha a orientação do punho e o deslocamento horizontal. Assim, "palma medial" continua apontando para o centro e "para a direita" continua sendo a direita de quem sinaliza.
- **Canhotos:** são espelhados para o rig, e a mão dominante vira sempre a do lado direito da tela.
- **Rótulo de mão do MediaPipe 1.2.3:** é a mão do sujeito, e imagem espelhada inverte, como diz a documentação. **Confirmado em 2026-11-26** com os 13 GIFs de cumprimentos do IFPR (câmera comum, sem espelho): o rótulo concordou com o corpo em 45 de 45 mãos. O corpo continua com prioridade, e o Estúdio mantém a concordância e o botão **Trocar D↔E** para mídias novas.
- **Ponto de articulação em 2D:** a câmera não vê profundidade. "Perto" quer dizer sobreposto na imagem. Por isso o ombro, o punho e o cotovelo do mesmo lado da mão ficam fora das âncoras (a mão erguida na frente do próprio ombro não o toca), e duas mãos próximas podem aparecer como contato.

## 7. Testes

```bash
npm test
```

São 30 testes em `src/pipeline/__tests__/`:
- ida e volta *rig → landmarks → solver* para todas as poses de polegar, dedos e palma nas duas mãos, inclusive palma medial × distal;
- lado das mãos: corpo, rótulo, mídia espelhada, troca manual, lado suspeito e estabilização em vídeo;
- deslocamento, inclusive o movimento para a direita;
- canhotos;
- limpeza e calibração;
- um teste com a **saída real do MediaPipe** (fixture), feita a partir de um render do rig;
- ponto de articulação num corpo sintético: testa, boca, queixo, tórax, lado do tronco, espaço neutro, punho e ombro do outro lado, palma da outra mão;
- proporções: a mão sintética do rig, em várias poses, mede as proporções do próprio rig.

Os testes sintéticos compartilham as convenções do próprio solver. Só filmagem real valida a interpretação do detector.

## 8. Ainda não feito (próximas fatias)

- **Conferir as sugestões contra escritas ELiS de referência.** Sem a escrita validada de cada palavra, não há como medir o acerto do classificador de configuração nem do ponto de articulação. Não use a própria sugestão como rótulo de calibração: o resultado seria circular.
- **Aplicar o posicionamento ao teclado.** As posições de `articulation3DMap.ts` foram escolhidas para legibilidade (mão ao lado do ponto). Usar a posição medida exige decidir entre fidelidade e legibilidade, e ajustar por tipo de módulo (cabeça, tronco, membros, mão), só em x e y.
- **Aplicar as proporções ao rig** (ver §9).
- **Reproduzir clipes no teclado**, como animação das palavras do dicionário.
- **Movimento** (etapa 5) automático. A trajetória da palma em coordenadas do corpo já é medida a cada quadro.
- **Passo VLM** do pitch: um modelo de visão e linguagem sugerindo a escrita ELiS a partir do vídeo.
- **Blender / MCP:** exportar para glTF ou BVH e fazer retarget para uma malha rigada. O Blender não está instalado nesta máquina, então isso não foi construído nem testado.
- **Proporções da mão** a partir das capturas, para ajustar o comprimento dos dedos do modelo.
- **Uso offline:** hospedar o WASM e os modelos em `public/` em vez da CDN.

## 9. Primeira medição de proporções (2026-11-26)

42 mãos dos GIFs de cumprimentos do IFPR (uma pessoa sinalizando), em comprimentos de palma, mediana:

| Segmento | Medido | Rig | Diferença |
|---|---|---|---|
| Largura da palma | 0,587 | 0,629 | −7% |
| Polegar (total) | 1,008 | 0,827 | +22% |
| Indicador: base / meio / ponta | 0,283 / 0,255 / 0,284 | 0,404 / 0,269 / 0,212 | total −7% |
| Médio: base / meio / ponta | 0,367 / 0,305 / 0,324 | 0,442 / 0,298 / 0,221 | total +4% |
| Anelar: base / meio / ponta | 0,319 / 0,284 / 0,280 | 0,404 / 0,269 / 0,212 | total 0% |
| Mínimo: base / meio / ponta | 0,234 / 0,250 / 0,225 | 0,317 / 0,212 / 0,183 | total 0% |

O comprimento total dos dedos do rig está certo, mas no rig a falange da base é 20–43% mais longa que a medida e a da ponta 19–32% mais curta, e o polegar é curto. Antes de mudar o rig: os pontos 3D do MediaPipe saem de um modelo treinado, que tende a uma mão média, e a amostra tem uma pessoa só. Vale repetir com as gravações da monitora.
