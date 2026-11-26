# Pipeline de captura — fotos e vídeos de Libras → rig 3D

> **Status (2026-11-26):** primeira fatia funcionando no **Estúdio de Captura** (`/estudio.html`). Testada com dados sintéticos e com a saída real do MediaPipe sobre um render do próprio rig. **Ainda não testada com filmagem real de Libras.**

## 1. Para que serve

Alimentar o modelo 3D das mãos com dados reais, por dois caminhos:

| Entrada | Saída | Onde é usada |
|---|---|---|
| **Foto** de um visografema isolado (polegar, dedos ou palma) | Amostra de **calibração** → `src/data/rigCalibration.json` | Substitui as poses ajustadas à mão em `getPoseFromElis`: o teclado e a Câmara de Testes passam a usar a pose real |
| **Vídeo** de uma palavra em Libras | **Clipe de sinal** → `src/data/clips/<palavra>.json` | Animação das palavras do dicionário (a reprodução no teclado é o próximo passo) |

## 2. Etapas

```
mídia ──► detecção ──► lado das mãos ──► limpeza ──► solver ──► sugestão ELiS ──► calibração / clipe
          MediaPipe     corpo > rótulo    One Euro    ângulos     polegar, dedos,
          mãos + corpo                    + falhas    do rig      palma
```

1. **Detecção** (`src/studio/detector.ts`): MediaPipe Tasks Vision 1.2.3 no navegador. Retorna 21 pontos por mão (na imagem e em metros) e 33 pontos do corpo (opcional). **A mídia não sai da máquina.**
2. **Lado das mãos** (`assignHandSides`): usa o punho do esqueleto do corpo mais próximo. Sem corpo, usa o rótulo do detector.
3. **Limpeza** (`filter.ts`, só para vídeo): preenche ausências de até 4 quadros e suaviza com filtro One Euro.
4. **Solver** (`solver.ts`): converte os pontos nos ângulos do rig procedural:
   - punho: orientação 3D;
   - polegar: CMC completo, mais MCP e IP;
   - cada dedo: MCP, PIP, DIP e abertura lateral;
   - deslocamento do punho, normalizado pela largura dos ombros.
5. **Sugestão ELiS** (`classify.ts`): compara a mão com as poses canônicas do teclado e ranqueia polegar (6), dedos (5) e palma (6).
6. **Saídas** (`calibration.ts`, Estúdio): média de amostras de calibração; clipe com recorte, metadados e status de validação.

## 3. Como usar

```bash
npm run dev
# abra http://localhost:5173/estudio.html
```

1. Arraste uma foto ou um vídeo. Também aceita um JSON de landmarks ou de clipe, para reprocessar sem a mídia.
2. Clique em **Extrair landmarks**.
3. **Confira a sobreposição:** "D" (dourado) deve estar na mão **direita** de quem sinaliza e "E" (vinho) na esquerda. Se estiver trocado, marque **Mídia espelhada** e extraia de novo.
4. **Fotos → calibração:**
   - escolha a etapa (Polegar, Dedos ou Palma) e o visografema;
   - clique em **Adicionar amostra** (de 3 a 5 fotos por visografema é um bom começo);
   - clique em **Salvar no repositório**.
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
- Nome do arquivo: `palavra_autor_AAAAMMDD.mp4`.
- Guarde os originais em `capturas/`, que está **fora do Git** (dados pessoais; ver [plano de ética/LGPD](plano-etica-lgpd.md)).

## 5. Formatos

Definidos em `src/pipeline/types.ts`. Todo arquivo traz `schema` e `version`:

- `acme.landmarks` v1: **fonte da verdade**. São os pontos limpos de cada quadro, independentes de engine, e servem de base para reprocessar com um solver melhor no futuro.
- `acme.signclip` v1: os landmarks recortados, os ângulos do rig (dados derivados) e os metadados (palavra, ELiS, autor, mão dominante, recorte, validação).
- `acme.rigcalibration` v1: as poses médias por visografema, sempre na convenção da mão direita.

Nenhum desses arquivos guarda imagem. Um clipe de 3 s a 30 quadros/s ocupa cerca de 300 kB.

## 6. Convenções importantes

- **Rig espelhado:** o teclado mostra a mão dominante à **direita da tela**, como um espelho de quem sinaliza. Por isso o solver espelha a orientação do punho e o deslocamento horizontal. Assim, "palma medial" continua apontando para o centro e "para a direita" continua sendo a direita de quem sinaliza.
- **Canhotos:** são espelhados para o rig, e a mão dominante vira sempre a do lado direito da tela.
- **Rótulo de mão do MediaPipe 1.2.3:** observamos que ele segue a convenção de *selfie*. Numa imagem não espelhada, "Left" é a mão direita de quem sinaliza. A documentação da biblioteca diz o contrário. O Estúdio mostra quanto o rótulo concorda com o esqueleto do corpo. Se a concordância ficar perto de 0% em filmagem real, a convenção está invertida.

## 7. Testes

```bash
npm test
```

São 15 testes em `src/pipeline/__tests__/`:
- ida e volta *rig → landmarks → solver* para todas as poses de polegar, dedos e palma nas duas mãos, inclusive palma medial × distal;
- lado das mãos e deslocamento, inclusive o movimento para a direita;
- canhotos;
- limpeza e calibração;
- um teste com a **saída real do MediaPipe** (fixture), feita a partir de um render do rig.

Os testes sintéticos compartilham as convenções do próprio solver. Só filmagem real valida a interpretação do detector.

## 8. Ainda não feito (próximas fatias)

- **Reproduzir clipes no teclado**, como animação das palavras do dicionário.
- **Ponto de articulação** (etapa 4) e **movimento** (etapa 5) automáticos. Os dados para isso (esqueleto do corpo e trajetória) já ficam guardados.
- **Passo VLM** do pitch: um modelo de visão e linguagem sugerindo a escrita ELiS a partir do vídeo.
- **Blender / MCP:** exportar para glTF ou BVH e fazer retarget para uma malha rigada. O Blender não está instalado nesta máquina, então isso não foi construído nem testado.
- **Proporções da mão** a partir das capturas, para ajustar o comprimento dos dedos do modelo.
- **Uso offline:** hospedar o WASM e os modelos em `public/` em vez da CDN.
