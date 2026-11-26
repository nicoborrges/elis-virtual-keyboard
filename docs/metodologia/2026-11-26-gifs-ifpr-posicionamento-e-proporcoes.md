# Primeiro teste com mãos humanas: GIFs do IFPR, ponto de articulação e proporções da mão

- **Data:** 2026-11-26
- **Etapa do cronograma:** Dez 2026 (mecânica base); pipeline de animação
- **Branch e commits:** `feat/pipeline-captura`, commit desta entrada (`feat[Pipeline]: ...GIF keyframes, location and hand proportions`)
- **Arquivos principais:** `src/studio/gifSource.ts`, `src/studio/detector.ts`, `src/pipeline/location.ts`, `src/pipeline/proportions.ts`, `src/studio/StudioApp.tsx`, `docs/pipeline-captura.md`

## Objetivo

A dupla esclareceu que a pipeline serve para melhorar de forma contínua três coisas no modelo 3D: a modelagem da mão, a animação dos sinais e o posicionamento da mão de acordo com os visografemas. A primeira fatia só cobria a configuração da mão (polegar, dedos e palma) e nunca tinha visto uma mão humana. Nesta etapa buscamos:

1. testar a pipeline com mãos humanas reais;
2. medir o ponto de articulação (etapa 4);
3. medir as proporções da mão.

## Como foi feito

1. **Fonte de referência.** Usamos o projeto Libras GIFs do IFPR Campus Umuarama (https://ifpr.edu.br/umuarama/libras-gifs/, acesso em 2026-11-26), indicado pela dupla. Baixamos os 13 GIFs da categoria Cumprimentos (versão sem legenda) para `capturas/ifpr/cumprimentos/`, fora do Git, com um `FONTE.txt`. A página não declara licença.
2. **Inspeção dos GIFs.** Decodificamos cada GIF com `ImageDecoder` (WebCodecs) no Chromium. Todos têm 800×640, fundo branco, câmera frontal sem espelho e ombros visíveis. Não são vídeos contínuos: têm de 2 a 9 quadros de 400 ou 450 ms, ou seja, são **poses-chave**.
3. **Leitura de GIF no estúdio.** Criamos `GifSource` (`src/studio/gifSource.ts`), que expõe os quadros com o tempo real de cada um, e `CaptureDetector.detectKeyframes`, que detecta cada quadro como foto independente (modo IMAGE do MediaPipe). Para esse tipo de mídia (`kind: 'keyframes'`), aplicamos só a estabilização do lado das mãos. Suavização e preenchimento de falhas supõem quadros próximos no tempo e misturariam poses diferentes.
4. **Ponto de articulação** (`src/pipeline/location.ts`):
   - Montamos um sistema de coordenadas do corpo: origem no meio dos ombros, x para a direita de quem sinaliza, y para cima, unidade igual à largura dos ombros.
   - Definimos âncoras para 23 Locais da etapa 4 a partir dos pontos do esqueleto (olhos, boca, nariz, orelhas, ombros, quadril, cotovelo e punho do outro braço, e pontos da outra mão).
   - Para cada âncora, medimos a menor distância até oito pontos da mão (cinco pontas, meio do indicador e do médio, centro da palma).
   - Ranqueamos com softmax (τ = 0,04). Quando nada fica a menos de 0,22 larguras de ombro, a mão conta como espaço neutro.
5. **Proporções da mão** (`src/pipeline/proportions.ts`): dividimos cada falange e a largura da palma pelo comprimento da palma (punho → base do dedo médio), nos pontos 3D do MediaPipe. Tomamos a mediana das mãos com score ≥ 0,8 e comparamos com a mão do rig em repouso, medida do mesmo jeito.
6. **Estúdio.** O estúdio passou a abrir GIF, a mostrar a sugestão de Local junto com polegar, dedos e palma, e a exibir um painel de proporções medidas × rig.
7. **Execução em lote.** Rodamos os 13 GIFs pelo console da página do estúdio (importando os módulos pelo servidor de desenvolvimento). Montamos uma folha de contato com os quadros e os esqueletos desenhados e conferimos visualmente.

## Decisões

- **GIF como poses-chave, não como clipe.** Com 0,4 s entre quadros não existe o movimento entre as poses, então esses GIFs não geram animação. Servem para configuração, posicionamento e proporções.
- **Corrigir o ponto de articulação a partir do que os dados mostraram:**
  - Na primeira versão, a mão erguida na frente do próprio ombro aparecia como "Ombro" (por exemplo, em "tchau", "meu nome" e "seu nome"). Em 2D a mão se sobrepõe ao ombro sem tocá-lo. Passamos a usar só o ombro do outro lado, como já fazíamos com punho e cotovelo.
  - A testa tinha um ponto só, no centro, e a mão na têmpora virava "Lateral da cabeça". Passamos a usar três pontos na testa e afastamos a âncora da lateral para fora da orelha.
- **Não ajustar mais os parâmetros pelos nossos olhos.** Ninguém da dupla nem o assistente é especialista em ELiS. Ajustar as âncoras até a sugestão "parecer certa" seria calibrar pelo palpite. O ajuste fino espera escritas ELiS de referência.
- **Não aplicar posições nem proporções ao rig ainda.** As posições do teclado (`articulation3DMap.ts`) foram escolhidas para legibilidade. Trocar por fidelidade é uma decisão de design da dupla. As proporções vêm de uma pessoa só e de pontos 3D estimados por modelo (ver Limitações).
- **Não usar a sugestão como rótulo de calibração.** Isso tornaria a calibração circular.

## Resultados e evidências

- **Detecção:** 45 mãos em 40 quadros, todas com o corpo detectado.
- **Lado das mãos:** o esqueleto do corpo decidiu o lado das 45 mãos. Na conferência visual de 23 quadros (10 GIFs), todos estavam certos. O rótulo de mão do MediaPipe concordou com o corpo em 45 de 45 (100%), o que confirma a convenção documentada (mão do sujeito; imagem espelhada inverte). Era a pendência principal da primeira fatia.
- **Aviso de lado suspeito:** apareceu em 2 mãos de "por favor", em que as duas mãos se tocam. O lado estava certo; é um falso alarme do teste de flexão quando os dedos se sobrepõem.
- **Configuração (sem referência):** dedos `g` (estendido) com 100% em "obrigado", "legal" e "tchau", em que a mão aberta é visível na imagem. O polegar sai `y` na maioria dos quadros. Não temos a escrita ELiS dessas palavras para dizer se está certo.
- **Ponto de articulação (sem referência):** a mão na boca ou no queixo no início de "bom dia", "boa tarde" e "boa noite" virou Boca ou Queixo; "prazer em conhecer" alternou Tórax e Abaixo do queixo; "obrigado" começou em Sobrancelha ou Olho, quando visualmente a mão está na testa e na têmpora. Duas mãos próximas na frente do corpo ("de nada", "por favor") viraram Ponta de dedo, porque o 2D não separa sobreposição de contato.
- **Proporções** (42 mãos):
  - o comprimento total de cada dedo do rig fica a até 7% do medido;
  - no rig, a falange da base é de 20% a 43% mais longa e a da ponta de 19% a 32% mais curta;
  - o polegar medido é 22% mais longo;
  - a palma medida é 7% mais estreita.
  A tabela completa está em `docs/pipeline-captura.md` §9.
- **Testes e build:** 30 testes automatizados passando (8 novos de ponto de articulação, 2 de proporções); lint e build sem erros. O bundle do teclado não mudou (`main` 49,13 kB; compartilhado 854,53 kB); o chunk do estúdio foi de 194 para 203 kB.
- **Estúdio:** conferido no navegador com "obrigado.gif". Os 2 quadros foram detectados, a sobreposição bate com cada quadro ao mover a linha do tempo, e as sugestões e o painel de proporções aparecem.

## Problemas e correções

- `frameAt` devolve o quadro mais próximo do tempo pedido. Num GIF, o quadro visível é o último que começou, então criamos `keyframeTime` no estúdio para buscar o quadro certo.
- Um script de edição com heredoc falhou no shell do Windows (aspas não fechadas); passamos a gravar o script em arquivo antes de rodar.

## Limitações

- **Uma pessoa só e uma variante regional.** Os sinais do IFPR podem ter variação regional (Paraná) e não foram validados pela Letras-UFG.
- **Pontos 3D estimados.** O MediaPipe estima os pontos 3D com um modelo treinado, que tende a uma mão média. As proporções medidas podem refletir esse modelo tanto quanto a mão real.
- **Ponto de articulação em 2D.** Sem profundidade, sobreposição na imagem conta como contato. Locais que só se separam com profundidade ou com mais detalhe do rosto ficam de fora.
- **Nenhuma sugestão foi conferida contra uma escrita ELiS de referência.**
- **Licença.** A página do IFPR não declara licença. Os GIFs ficam só na máquina, e os landmarks derivados deles não foram versionados.

## Próximos passos

- Obter da monitora da Letras a escrita ELiS validada de alguns cumprimentos do IFPR, para medir o acerto da configuração e do ponto de articulação.
- Decidir com a dupla se o teclado deve usar o posicionamento medido (fidelidade) ou continuar com o atual (legibilidade).
- Repetir a medição de proporções com as gravações da monitora antes de mudar o rig.
- Perguntar ao IFPR sobre a licença, se os dados derivados forem para o repositório ou para o jogo.
