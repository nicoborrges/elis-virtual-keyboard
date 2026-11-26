# Artigos sobre a ELiS, conferência do mapa de visografemas e o sinal SEMANA

- **Data:** 2026-11-26
- **Etapa do cronograma:** Dez 2026 (mecânica base, dicionário de dados); pipeline de captura
- **Branch e commits:** `main`, commit desta entrada (`feat[Pipeline]: ELiS references from Barros (2016)...`)
- **Arquivos principais:** `docs/referencias-elis.md`, `src/data/elisReferences.json`, `src/pipeline/solver.ts` (`stabilizeSides`), `src/pipeline/__tests__/references.test.ts`, `src/pipeline/__tests__/pipeline.test.ts`

## Objetivo

Usar dois artigos sobre a ELiS enviados pela dupla para: (1) registrar a fonte do exemplo de BONITO, (2) conferir o mapa de visografemas do teclado contra a criadora do sistema e (3) ganhar mais escritas de referência para medir a pipeline.

## Como foi feito

1. Lemos os dois PDFs: Barros (2016), na *Revista Sinalizar*, e Freitas, Barros e Fernandes (2020), na *Revista Porto das Letras* (referências completas em `docs/referencias-elis.md`).
2. Em Barros (2016), a camada de texto do PDF traz os glifos como os caracteres da fonte ELiS (por exemplo, BONITO sai como `tgçQÄ`). Usamos esse texto, e não leitura visual, para as escritas de referência. Em Freitas et al. (2020) as escritas são imagens; não as transcrevemos.
3. Comparamos as tabelas de Barros (2016) com os 95 itens de `src/data/elisMap.ts`, caractere por caractere.
4. Guardamos as seis escritas do artigo em `src/data/elisReferences.json` (versão 2 do formato, com mãos dominante e não dominante e um glifo por dedo quando há). Um teste confere se cada glifo existe na fonte, na etapa certa, e se a escrita monomanual segue a ordem polegar, dedos, palma, local, movimento.
5. Procuramos esses sinais no IFPR. Só SEMANA tem GIF (categoria Calendário, 2 quadros de 0,5 s). Rodamos a pipeline nele.

## Resultados e evidências

- **Fonte de BONITO:** é Barros (2016, p. 207). O artigo descreve o movimento `Ä` como "fechar a mão dedo a dedo (tamborilar de dedos sem repetição)". Isso resolve a dúvida da entrada anterior: o GIF do IFPR, que termina com a mão fechando, é o mesmo sinal, e o rótulo de `Ä` no mapa está certo.
- **Mapa de visografemas:** os 95 caracteres e significados de `elisMap.ts` batem com Barros (2016). Só há diferença de nome em três Locais (`J`, `P`, `L`).
- **Erro encontrado e corrigido em SEMANA:**
  - Na primeira execução, o quadro #0 saiu com as duas mãos marcadas como esquerdas, embora o punho do esqueleto e o rótulo do detector indicassem certo.
  - A causa estava em `stabilizeSides`. A mão direita do quadro 0 (x 0,46) e a esquerda do quadro 1, 0,5 s depois (x 0,55), ficaram perto o bastante para entrar na mesma trilha. A votação empatou e reescreveu um lado que o corpo já tinha decidido.
  - Corrigimos de duas formas: a votação agora só altera mãos cujo lado veio do rótulo, e um quadro nunca termina com duas mãos do mesmo lado.
  - Escrevemos um teste com esse caso. Ele falha sem a correção e passa com ela.
  - Depois disso, SEMANA ficou com 4 de 4 mãos concordando com o corpo, e os 13 cumprimentos continuaram com 44 de 44 e nenhum quadro com lado duplicado.
- **SEMANA contra a referência** (`tg qggq v J é`):
  - Mão dominante: polegar `q` ✓; palma `v` 99% ✓; Local `K` (tórax), com `J` (corpo) em 2º; a palma se desloca para a direita de quem sinaliza (x de −0,09 a +0,76), como indica `é`.
  - Dedos da mão dominante: a referência escreve um glifo por dedo (`ggq`: indicador e médio estendidos, os outros fechados). O classificador só dá um glifo para os quatro dedos e sugeriu `o`.
  - Mão não dominante: dedos `g` ✓, palma `v` ✓ no quadro #1, polegar `y` com `t` em 2º.
- **Testes:** 34 passando; lint e build sem erros.

## Decisões

- **Escritas tiradas da camada de texto, não da imagem.** A camada de texto do PDF dá o caractere exato; transcrever pela imagem arriscaria trocar glifos parecidos.
- **Guardar também os sinais que a pipeline ainda não sabe comparar** (bimanual assimétrico, composto, mão de apoio), com o tipo de sinal registrado. Eles mostram o que falta.
- **Não mudar os rótulos do `elisMap.ts`.** As diferenças são de nome, e os rótulos aparecem na interface do teclado.

## Limitações

- Duas referências com GIF (BONITO e SEMANA), da mesma fonte e com sinalizantes diferentes da autora. Ainda não dá para falar em taxa de acerto.
- `J` (corpo) e `K` (tórax) se sobrepõem em 2D quando a mão fica na frente do peito.
- O livro de referência (Barros, 2015) não foi consultado.

## Próximos passos

- Decidir com a dupla se o classificador (e depois o teclado) deve aprender a configuração de dedos por dedo, já que a ELiS escreve assim (`qggq`, `gsq`).
- Classificar movimentos simples de direção (`é`, `ê`, `ã`, `ä`) a partir do deslocamento da palma entre as poses-chave.
