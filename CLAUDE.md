# CLAUDE.md — Acme: The ELiS Game

> Documento vivo de contexto para o Claude Code. Separa **o que o pitch diz**, **o que já foi decidido** e **o que ainda está em aberto**. Detalhes técnicos do teclado e do modelo 3D ficam em [README.md](README.md) e [NOTAS_MODELO_3D.md](NOTAS_MODELO_3D.md) — não duplicar aqui.

## 1. Visão em uma frase

**Acme** é um *point-and-click puzzle adventure* em que a **escrita de sinais ELiS** (Escrita das Línguas de Sinais) é a mecânica central: o jogador explora um mundo cinza e silenciado e o devolve à cor **escrevendo sinais em ELiS** com um teclado de visografemas.

*Tagline:* "O poder de moldar a realidade está em seus gestos." — TCC, INF/UFG.
Fonte: [docs/Acme_Pitch_Deck.pptx](docs/Acme_Pitch_Deck.pptx) (9 slides).

## 2. Estado atual do repositório

Este repo hoje é o **protótipo do teclado ELiS** (Vite + React 19 + TS + Tailwind + Three.js), não o jogo:

- `src/components/SelectorKeyboard.tsx` — teclado seletor em 5 etapas (Polegar → Dedos → Palma → Local → Movimento).
- `src/components/VisorArea.tsx` — visor com os sinais escritos na fonte `ELiS-Beta.otf`.
- `src/components/Hands3DCanvas.tsx` + `scene/BodyContextProps.ts` — duas mãos 3D procedurais que tocam o sinal em loop (`Enter`).
- `src/data/elisMap.ts` — dicionário dos 95 visografemas (char da fonte ↔ etapa ↔ rótulo).
- `src/data/articulation3DMap.ts` — pontos de articulação → posição 3D / câmera.

O teclado é o **adaptador de entrada** do futuro jogo (ver §4).

## 3. O que o pitch define

| Tema | Pitch |
|---|---|
| Problema | Software educativo trata língua como obrigação; escrita de sinais é invisível no digital |
| Proposta | Conquista, mistério e descoberta; aprendizado por **causa e efeito**, não por tutorial |
| Público | Universal: surdos e não surdos |
| Pilar | **100% visual, sem texto nem voice acting** |
| Gênero | Point-and-Click Puzzle Adventure, orientação **vertical** |
| Game loop | Explorar cenário → Ler pista visual → Montar sinal em ELiS → **Conjurar** → Feedback de mundo → Recompensa/desbloqueio → (novo ecossistema) |
| Famílias de puzzle | Feedback de mundo · Ligação de pontos · Avatar comunicador · Construção de visografemas |
| Progressão | Capítulos com escalada temática rumo ao *acme* (grafo: Início → Natureza / Social → Classificadores / Sintaxe / Emoções → Acme); pontuação por tempo e precisão; endgame com missões pós-história |
| Animação | 5 parâmetros (polegar, demais dedos, rotação do punho, antebraço + ponto de articulação, curva de movimento) alimentando uma pipeline de IA (foto/vídeo → CV+VLM → rig no Blender via MCP → animação/retarget). **Contingência:** simbologia estática sequencial + poses-chave |
| Arquitetura | Hexagonal: Adaptador de entrada (teclado ELiS) → Núcleo (parser de visografemas, nós lógicos e regras) → Adaptador de saída (triggers de gameplay). SOLID, regras em blocos de visografemas |
| Validação | Sessões observadas **sem instrução textual** com surdos, não surdos e especialistas em Libras/ELiS; medir tempo/precisão de montagem e leitura das pistas |

## 4. Decisões já tomadas (pós-pitch)

- **Plataforma: jogo de navegador** (web), com o teclado ELiS embutido. ⚠️ *Substitui* o "Mobile Android + Unity/Godot" do pitch — confirmar (ver §7).
- O teclado deste repo é a base do adaptador de entrada. Mapeamento pitch → código:
  - 5 parâmetros do slide 5 ≈ 5 slots do teclado (`StepNumber 1..5`).
  - "Parser de visografemas" ≈ `elisMap.ts` + lógica de consolidação em `App.tsx` (ainda sem regras de puzzle).
  - "Triggers de gameplay" — **não existe ainda**.
  - Pipeline de animação: hoje é o rig procedural (ver NOTAS_MODELO_3D.md), equivalente à contingência "poses-chave".

### Próximos marcos (roadmap do pitch, slides 8–9)

| Quando | Entrega |
|---|---|
| Dez 2026 | Projeto, mecânica base, **dicionário de dados**, assets |
| Jan | Game feel e cena inicial |
| Fev | Primeiro capítulo |
| Mar–Abr | Testes iniciais com possíveis usuários |
| Mai 2027 | Primeiro segmento de aprendizado |
| Jun 2027 | Progressão de capítulos e segmentos |

Desafios declarados: (1) fechar o escopo do 1º capítulo; (2) validar a pipeline de animação com sinais reais; (3) iniciar testes com a comunidade surda.

## 5. Identidade visual (do pitch)

Referência: artes conceituais do deck (logo dourado, figura encapuzada com mão brilhando, mundo cinza com flor dourada, ilhas flutuantes que recuperam cor). São **direção de arte**, não lore fechada.

- **Clima:** dark fantasy clássica/greco-romana — pedra, ouro envelhecido, louros, coluna jônica, molduras com cantoneiras.
- **Narrativa de cor:** mundo dessaturado → cada sinal conjurado traz **ouro (magia/escrita)** e **verde-sálvia (vida restaurada)**.
- **Paleta** (tokens Tailwind em `tailwind.config.js`):
  - `void` `#0A0908` — fundo
  - `ink-*` — cinzas quentes de pedra (`#34312C`, `#45413B`, `#8F8A81`, `#A9A399`, `#EEEAE3`)
  - `gold-*` — acento principal (`gold-400` = `#D8AE5E`): foco, seleção, ação primária
  - `vida-*` — verde-sálvia (`#8FC4AE`): estado "tocando"/conjurado, slot preenchido
  - `wine-*` — vinho do manto/nós de capítulo: perigo, apagar
- **Tipografia:** `Cinzel` (títulos/marca), `IBM Plex Mono` (rótulos técnicos, números), `Inter` (UI), `ELiS` (glifos — nunca trocar).
- **Motivo recorrente:** cantoneiras douradas em "L" nos cantos dos painéis (classe `.acme-frame`).

## 6. Convenções

- Idioma do código: identificadores em inglês; textos de UI e docs em pt-BR.
- Commits: `tipo[Escopo]: descrição` (ex.: `feat[ELiSKeyboard]: ...`, `fix[Hands3D]: ...`).
- Antes de concluir: `npm run lint` e `npm run build`.
- Não alterar `public/fonts/ELiS-Beta.otf` nem os `char` de `elisMap.ts` sem validar na fonte.

## 7. Em aberto (decidir com o Nicolas)

1. Navegador substitui de vez Android + Unity/Godot? O jogo nasce **neste repo/stack** (React + Three.js) ou em outro (Phaser, PixiJS, Godot Web export)?
2. Cenas do jogo: 2D ilustrado (como as artes) ou 3D? E o avatar com as mãos 3D aparece dentro da cena ou só no teclado?
3. O pilar "sem texto" vale para o **teclado** também? Hoje há rótulos (Espaço, Tocar, Tabela, nomes das etapas).
4. Como um puzzle valida um sinal: match exato dos 5 visografemas ou com tolerância (ex.: só configuração de mão + local)?
5. Escopo do 1º capítulo: qual ecossistema, quantos puzzles, qual vocabulário de sinais?
6. Roadmap do slide 8 está fora de ordem (Dez 2026 → Jan/Fev **2026** → Mai 2027) — provavelmente Jan/Fev **2027**?
7. Orientação vertical continua (mobile web) ou o navegador também suporta desktop/paisagem?
8. Qual o papel do Movimento (etapa 5) no loop "Conjurar": a mão anima antes do feedback de mundo?
