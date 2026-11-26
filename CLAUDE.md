# CLAUDE.md — Acme: The ELiS Game

> Documento vivo de contexto para o Claude Code. Separa **o que os decks dizem**, **o que já foi decidido** e **o que ainda está em aberto**. Detalhes técnicos do teclado e do modelo 3D ficam em [README.md](README.md) e [NOTAS_MODELO_3D.md](NOTAS_MODELO_3D.md) — não duplicar aqui.

## 1. Visão em uma frase

**Acme** é um *point-and-click puzzle adventure* de navegador, em visão **isométrica**, em que a **escrita de sinais ELiS** (Escrita das Línguas de Sinais) é a mecânica central: o jogador explora um império cinza e silenciado e o devolve à cor **escrevendo palavras reais de Libras em ELiS** (ex.: escrever "fogo" gera fogo).

*Tagline:* "O poder de moldar a realidade está em seus gestos." — TCC, INF/UFG, conclusão em **agosto de 2027**, desenvolvido em **dupla**.

Fontes (em `docs/`):
- [Acme_Pitch_Deck.pptx](docs/Acme_Pitch_Deck.pptx) — pitch (9 slides), mais recente.
- [ELiS Game - 17_07_2026 (1).pptx](<docs/ELiS Game - 17_07_2026 (1).pptx>) — apresentação de jul/2026 (23 slides): narrativa, prólogo, gaps. Plataforma/engine/cronograma dela estão **desatualizados**.

## 2. Estado atual do repositório

Este repo hoje é o **protótipo do teclado ELiS** (Vite + React 19 + TS + Tailwind + Three.js). O jogo vai nascer **neste repo** (por enquanto).

- `src/components/SelectorKeyboard.tsx` — teclado seletor em 5 etapas (Polegar → Dedos → Palma → Local → Movimento).
- `src/components/VisorArea.tsx` — visor com os sinais escritos na fonte `ELiS-Beta.otf`.
- `src/components/Hands3DCanvas.tsx` + `scene/BodyContextProps.ts` — duas mãos 3D procedurais que tocam o sinal em loop (`Enter`).
- `src/data/elisMap.ts` — os 95 visografemas (char da fonte ↔ etapa ↔ rótulo).
- `src/data/articulation3DMap.ts` — pontos de articulação → posição 3D / câmera.

O teclado é um **módulo à parte** (adaptador de entrada). O protótipo atual é, na prática, o embrião da **Câmara de Testes** (ver §4).

## 3. O que os decks definem

| Tema | Decks |
|---|---|
| Problema | Software educativo trata língua como obrigação; escrita de sinais é invisível no digital |
| Proposta | Conquista, mistério e descoberta; aprendizado por **causa e efeito**, não por tutorial |
| Público | Universal: surdos e não surdos |
| Pilar | **100% visual, sem texto nem voice acting** (meta do jogo final) |
| Game loop | Explorar cenário → Ler pista visual → Montar sinal em ELiS → **Conjurar** → Feedback de mundo → Recompensa/desbloqueio → (novo ecossistema) |
| Famílias de puzzle | Feedback de mundo · Ligação de pontos · Avatar comunicador · Construção de visografemas |
| Progressão | Capítulos rumo ao *acme* (grafo: Início → Natureza / Social → Classificadores / Sintaxe / Emoções → Acme); pontuação por tempo e precisão; endgame com missões pós-história |
| Animação | 5 parâmetros (polegar, demais dedos, rotação do punho, antebraço + ponto de articulação, curva de movimento) → pipeline de IA (foto/vídeo → CV+VLM → rig no Blender via MCP → animação/retarget). **Contingência:** simbologia estática sequencial + poses-chave |
| Arquitetura | Hexagonal: Adaptador de entrada (teclado ELiS) → Núcleo (parser de visografemas, nós lógicos e regras) → Adaptador de saída (triggers de gameplay). SOLID, regras em blocos de visografemas |
| Validação | Sessões observadas **sem instrução textual** com surdos, não surdos e especialistas em Libras/ELiS; medir tempo/precisão de montagem e leitura das pistas |

### Narrativa (deck de jul/2026)

- **Prólogo — O Silêncio e a Fagulha:** o protagonista (a **figura encapuzada** das artes) desperta sem memória no cume de uma montanha em ruínas; o mundo é cinza, estático, sem som nem vento (árvore seca, rio congelado, porta de pedra). Uma **fagulha dourada** (espírito-guia não verbal; **as mãos 3D do teclado atual são o protótipo dela** — ver §4) flutua até uma raiz morta e **performa um sinal em Libras** em loop. O jogador só observa; a raiz se rompe e nasce uma flor — a primeira cor. Regra do mundo ensinada por observação, sem tutorial.
- **Jornada em duas frentes:**
  - *Libertação* — descer a montanha e libertar regiões oprimidas; cada feitiço em ELiS revela o ecossistema original (mármore → rio corrente, forjas reacesas) e conta por que o império caiu.
  - *Identidade* — o protagonista hesita, aprende e falha; com a fluência em ELiS/Libras ele lembra quem é, os gestos ficam firmes e a magia mais intensa.
- História contada **pelo ambiente e pelo avatar comunicador** — sem texto.

## 4. Decisões já tomadas

**Plataforma e tecnologia**
- **Jogo de navegador.** Substitui Android + Unity/Godot dos decks.
- **Visão isométrica** (2.5D: mistura de 2D e 3D), **tela deitada (paisagem)**. O teclado protótipo ainda é vertical — vai precisar de layout paisagem.
- **Roda online — servidor pesado, cliente leve**: o servidor cuida da lógica, do dicionário e da entrega das animações; o navegador só desenha cenas leves. **Não** é cloud streaming de vídeo.
- **Login com conta Google.**
- **Hospedagem: UFG** (viabilidade, contato e plano B ainda serão conversados). Sem preferência de stack de backend — propor opções compatíveis com a infra da UFG.
- **Bibliotecas/engine ainda não definidas** — não assumir React + Three.js para o jogo só porque o protótipo usa. Propor opções com prós/contras antes de adotar.
- **Desempenho e acessibilidade são prioridade sempre**: o projeto precisa rodar bem no maior número possível de dispositivos e pessoas. Considerar custo (bundle, draw calls, memória) em toda decisão.
- **Sem som e sem vibração.** Todo feedback é **visual**.
- **Acessibilidade focada na surdez** (não há escopo para outras deficiências por enquanto).
- **Backend:** progresso e telemetria vão para **servidor/banco de dados**.
- Jogo nasce **neste repo** por enquanto.

**Gameplay e conteúdo**
- **Sinais = palavras reais de Libras** escritas em ELiS; o significado vira efeito no mundo (ex.: "fogo" → fogo). Isso exige um **dicionário de dados** ELiS ↔ palavra ↔ efeito.
- **Dicionário próprio:** não existe base digital ELiS ↔ Libras; **vamos criar a nossa**. Sem variações regionais. Cadastro feito **diretamente pela dupla e pela monitora da Letras**. Começa como **arquivo no repo** (ex.: JSON em `src/data/`) e depois migra para o **banco de dados** — modelar já pensando nessa migração.
- **Campos de cada entrada do dicionário** (aprovados): palavra em português · sequência ELiS · vídeo de referência · animação · efeito no jogo · capítulo · dificuldade. (Mais um `id` estável e o status de validação pela Letras-UFG.)
- **Primeiros sinais:** critério e lista ainda não definidos.
- **Progressão de conteúdo:** começar pelos sinais mais fáceis de ensinar e evoluir. O teclado ganhará dinamismo (mais visografemas por grupo, sinais compostos etc.) **conforme a necessidade** — não generalizar antes da hora.
- **Grimório:** sim — um sinal entra na **primeira conjuração** bem-sucedida.
- **Pista visual:** depende do puzzle (sem formato único).
- **Quem performa o sinal na tela:** as **mãos 3D do painel do teclado** (como no protótipo). **Essas mãos são o protótipo da fagulha**: no jogo final, quem performa os sinais é a fagulha (forma final do que hoje são as mãos procedurais).
- **No jogo, o teclado abre a partir de um botão** como **painel lateral**: **não cobre a cena e não pausa o jogo** — a cena fica visível para o jogador ver o efeito do sinal. **Nada acontece no mundo enquanto o jogador escreve** (sem inimigos/eventos durante a escrita). Design do painel (lado, tamanho) ainda não definido.
- **O protagonista não reage à conjuração** na cena; quem reage/comunica é o **avatar comunicador**.
- **Teclado = módulo à parte.** Muito provavelmente haverá uma **Câmara de Testes**: modo livre onde o jogador pratica ELiS e as mãos 3D animam **qualquer combinação** escrita (como hoje).
- **Combate:** pode haver; a lógica de gameplay é passo futuro.
- **Pilar "sem texto"**: meta do **jogo final**. No **protótipo atual o texto explicativo fica** (rótulos das etapas, Espaço, Tocar, Tabela, dicas). Não remover textos da UI sem pedido.

**Arte e animação**
- Assets: **metade gerados por IA, metade assets livres de licença** (preferir CC0; registrar origem/licença de cada asset).
- **Pipeline de IA está no escopo**: vai alimentar o 3D/animação dos sinais. Vídeos de referência gravados pela **monitora da Letras**. O rig procedural atual (NOTAS_MODELO_3D.md) equivale à contingência "poses-chave".
- **Duas fontes de animação:** o **rig procedural** continua animando **qualquer combinação** (Câmara de Testes); **palavras do dicionário** usam as animações da **pipeline de IA**.

**Pesquisa e projeto**
- Telemetria de tempo/precisão: **muito provavelmente** sim.
- Ética em pesquisa e LGPD: ver [docs/plano-etica-lgpd.md](docs/plano-etica-lgpd.md) — **submissão ao CEP é urgente** para os testes de mar/2027. Pesquisador responsável: **Nicolas** (a confirmar se o CEP aceita graduando). **Sem menores** e **sem filmagem**.
- Validação linguística dos sinais: **equipe especializada da Letras-UFG**.
- Prazo de conclusão: **agosto de 2027**. Equipe: **2 pessoas**, com fluxo de **branches e PRs** no Git.
- **Cronograma válido: o do pitch** (início dez/2026).
- Nome **Acme** é definitivo.

**Mapeamento decks → código**
- 5 parâmetros do slide 5 ≈ 5 slots do teclado (`StepNumber 1..5`).
- "Parser de visografemas" ≈ `elisMap.ts` + consolidação em `App.tsx` (ainda sem regras de puzzle nem dicionário de palavras).
- "Triggers de gameplay" — **não existe ainda**.

### Cronograma (pitch — vale este; o do deck de jul/2026 está superado)

| Quando | Entrega |
|---|---|
| Dez 2026 | Projeto, mecânica base, **dicionário de dados**, assets iniciais |
| Jan 2027 | Game feel e cena inicial |
| Fev 2027 | Primeiro capítulo |
| Mar–Abr 2027 | Testes iniciais com possíveis usuários |
| Mai 2027 | Primeiro segmento de aprendizado |
| Jun 2027 | Progressão de capítulos e segmentos |
| Ago 2027 | Conclusão do TCC |

Desafios declarados: fechar o escopo do 1º capítulo; validar a pipeline de animação com sinais reais; iniciar testes com a comunidade surda; definir o conteúdo inicial de Libras/ELiS.

## 5. Identidade visual

Referência: artes conceituais dos decks (logo dourado, figura encapuzada com mão brilhando, mundo cinza com flor dourada, ilhas flutuantes **isométricas** que recuperam cor). São **direção de arte**.

- **Clima:** dark fantasy clássica/greco-romana — pedra, ouro envelhecido, louros, coluna jônica, molduras com cantoneiras.
- **Narrativa de cor:** mundo dessaturado → cada sinal conjurado traz **ouro (magia/escrita/fagulha)** e **verde-sálvia (vida restaurada)**.
- **Paleta** (tokens Tailwind em `tailwind.config.js`):
  - `void` `#0A0908` — fundo
  - `ink-*` — cinzas quentes de pedra (`#34312C`, `#45413B`, `#8F8A81`, `#A9A399`, `#EEEAE3`)
  - `gold-*` — acento principal (`gold-400` = `#D8AE5E`): foco, seleção, ação primária
  - `vida-*` — verde-sálvia (`#8FC4AE`): estado "tocando"/conjurado, slot preenchido
  - `wine-*` — vinho do manto/nós de capítulo: perigo, apagar
- **Tipografia:** `Cinzel` (títulos/marca), `IBM Plex Mono` (rótulos técnicos, números), `Inter` (UI), `ELiS` (glifos — nunca trocar). Hoje vêm do Google Fonts (avaliar self-host por desempenho).
- **Motivo recorrente:** cantoneiras douradas em "L" nos cantos dos painéis (classe `.acme-frame`).
- Como não há som nem vibração, **cor, luz e movimento carregam todo o feedback**.

## 6. Convenções

- Idioma do código: identificadores em inglês; textos de UI e docs em pt-BR.
- Commits: `tipo[Escopo]: descrição` (ex.: `feat[ELiSKeyboard]: ...`, `fix[Hands3D]: ...`). **Sempre commitar** ao concluir uma alteração (pedido do Nicolas).
- Antes de concluir: `npm run lint` e `npm run build`.
- Não alterar `public/fonts/ELiS-Beta.otf` nem os `char` de `elisMap.ts` sem validar na fonte.
- Sinais/palavras de Libras novos só entram no dicionário com validação da equipe da Letras-UFG.

## 7. Em aberto (decidir com o Nicolas)

**Ainda indefinidos**
- Escopo do 1º capítulo e critério/lista dos primeiros sinais.
- Validação do sinal num puzzle (match exato ou tolerância) e o que acontece num sinal errado.
- Papel do Movimento (etapa 5) no "Conjurar".
- Formato de saída da pipeline de IA para o navegador (ex.: glTF + clipes de animação).
- Divisão de papéis entre os dois desenvolvedores.
- Pendências do [plano de ética/LGPD](docs/plano-etica-lgpd.md) §7: nº e local dos testes, login × código de sessão, dados de grupo, gravação de tela.
- Hospedagem UFG: contato e plano B (a conversar).

**7ª rodada (2026-11-26)**
- *Avatar comunicador:* quem é — um NPC na cena que conversa em Libras? Como ele sinaliza (mãos 3D próprias, a mesma tecnologia da fagulha)? Ele é a fonte principal das pistas visuais?
- *Fagulha no jogo final:* ela vive dentro do painel do teclado ou flutua na cena até o alvo (como no prólogo)?
- *Design do painel lateral:* lado, tamanho, troca para canhotos — ainda indefinido.
- *Testes:* nº de participantes, local, login × código de sessão, gravação de tela — ainda indefinido.
