# Primeira escrita ELiS de referência: BONITO

- **Data:** 2026-11-26
- **Etapa do cronograma:** Dez 2026 (mecânica base, dicionário de dados); pipeline de captura
- **Branch e commits:** `feat/pipeline-captura`, commit desta entrada (`feat[Pipeline]: First ELiS reference (BONITO)...`)
- **Arquivos principais:** `src/data/elisReferences.json`, `src/pipeline/location.ts`, `src/pipeline/__tests__/location.test.ts`, `src/pipeline/__tests__/references.test.ts`

## Objetivo

Conferir pela primeira vez as sugestões da pipeline contra uma escrita ELiS conhecida. Até aqui só sabíamos que a detecção funcionava, não se as sugestões estavam certas.

## Como foi feito

1. A dupla enviou um trecho de texto sobre a ELiS. O trecho descreve a ordem fixa da escrita (configuração de dedos, orientação da palma, ponto de articulação, movimento) e traz o sinal BONITO como exemplo, junto com o link da página de Adjetivos do IFPR, onde está o GIF desse sinal.
2. Identificamos cada glifo da imagem comparando com a fonte `ELiS-Beta.otf` do projeto. Desenhamos os 95 visografemas de `elisMap.ts` num canvas, ao lado do trecho ampliado. Resultado: `t g ç Q Ä`, ou seja, polegar horizontal, demais dedos estendidos, palma para trás, rosto e movimento `Ä` (rotulado no mapa como "tamborilar de dedos").
3. Baixamos o GIF de BONITO do IFPR (3 quadros de 0,5 s) para `capturas/ifpr/adjetivos/`, fora do Git, e rodamos a pipeline.
4. Comparamos cada quadro com a referência.

## Resultados e evidências

| Quadro | O que se vê | Polegar | Dedos | Palma | Local |
|---|---|---|---|---|---|
| #0 | Mão subindo ao lado do rosto | `y` (t em 6º) | `g` 100% | `ç` 98% | Orelha |
| #1 | Mão aberta, palma para quem sinaliza, na frente do rosto | **`t` 96%** | **`g` 60%** | **`ç` 99%** | Sobrancelha (antes da regra); **Rosto** (depois) |
| #2 | Mão fechando perto do queixo | `e` | `o` | `ç` 100% | Espaço neutro |

- O quadro #1 é a pose da escrita, e nele polegar, dedos e palma saíram em primeiro lugar.
- O rótulo do MediaPipe concordou com o corpo em 3 de 3.
- Rosto (17) estava fora das âncoras porque não tem um ponto só. Criamos uma regra: Rosto quando o centro da palma fica a menos de 1,0 altura de rosto (olhos → boca) do nariz. Em BONITO #1 essa distância é 0,58; nos 40 quadros dos 13 cumprimentos o mínimo é 1,72. Com a regra, Rosto passou a ser a 1ª sugestão em BONITO #1 (26%) e nenhum quadro dos cumprimentos mudou.
- Com isso, a sugestão do estúdio para o quadro #1 fica `tgçQ`, igual às quatro primeiras partes da referência.
- Testes: 32 passando (novo teste do Rosto, testes da boca e do queixo ajustados, e um teste que confere se cada parte da referência existe na fonte, na etapa certa e na ordem certa). Lint e build sem erros.

## Decisões

- **Referência separada do dicionário.** A escrita foi para `src/data/elisReferences.json`, marcada como não validada pela Letras-UFG. Ela serve para medir a pipeline, não para entrar no jogo.
- **Limiar do Rosto escolhido entre os dois grupos observados** (0,58 e 1,72). Com um exemplo só, isso é uma hipótese a revisar quando houver mais sinais escritos com Rosto.
- **Mudança no teste sintético.** O teste da boca usava uma "mão" do tamanho de um ponto, com a palma em cima da boca, e passou a cair na regra do Rosto. Mudamos para uma mão com a palma ao lado do rosto e só as pontas dos dedos no ponto, como numa mão real.

## Limitações

- Uma referência só: não dá para falar em taxa de acerto.
- Movimento (`Ä`) não é medido. No GIF do IFPR a mão fecha descendo para o queixo, o que não parece "tamborilar". Pode ser variante do sinal, ou o rótulo de `Ä` no `elisMap.ts` pode estar errado. A equipe da Letras precisa conferir.
- A escolha do quadro que representa a escrita (#1) foi feita a olho. A pipeline ainda não escolhe sozinha o quadro "da escrita".
- A fonte bibliográfica do trecho ainda não foi registrada.

## Próximos passos

- Registrar a referência bibliográfica do trecho.
- Juntar mais escritas de referência (de preferência de sinais com GIF no IFPR) e só então medir a taxa de acerto por etapa.
- Detectar automaticamente o quadro de pose estável que corresponde à escrita.
