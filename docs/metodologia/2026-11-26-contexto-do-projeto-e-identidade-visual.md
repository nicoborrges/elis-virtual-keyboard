# Documento de contexto do Acme e identidade visual no protótipo

- **Data:** 2026-11-26
- **Etapa do cronograma:** preparação para Dez 2026 (projeto)
- **Branch e commits:** `main`, `345f143`, `0dc7384`, `8b1aba7`, `8c75614`, `463e094`, `3bba505`
- **Arquivos principais:** `CLAUDE.md`, `tailwind.config.js`, `src/index.css`, componentes do teclado

## Objetivo

Reunir num só lugar o que os dois decks definem, o que já foi decidido e o que está em aberto, e aplicar ao protótipo a direção de arte das artes conceituais.

## Como foi feito

1. Extraímos o texto dos slides dos dois decks (`docs/Acme_Pitch_Deck.pptx`, 9 slides, e `docs/ELiS Game - 17_07_2026 (1).pptx`, 23 slides) lendo o XML de cada slide.
2. Montamos o `CLAUDE.md` em sete seções: visão, estado do repositório, o que os decks definem, decisões tomadas, identidade visual, convenções e questões em aberto.
3. Fizemos sete rodadas de perguntas e respostas com a dupla. Cada resposta entrou como decisão no `CLAUDE.md` e cada rodada gerou novas perguntas. Quando uma resposta contradizia o deck (por exemplo, navegador em vez de Android com Unity ou Godot), a decisão da dupla passou a valer e o deck foi marcado como desatualizado naquele ponto.
4. Identidade visual: paleta em tokens do Tailwind (`void` #0A0908, `ink` em cinzas quentes, `gold-400` #D8AE5E, `vida` #8FC4AE, `wine`), fontes Cinzel, IBM Plex Mono e Inter, e cantoneiras douradas nos painéis (classe `.acme-frame`). Os glifos continuam na fonte ELiS.

## Decisões

As decisões estão no `CLAUDE.md` §4. As que mais afetam a metodologia: jogo de navegador em visão isométrica, sinais como palavras reais de Libras, dicionário próprio validado pela Letras-UFG, sem som e sem vibração, e o cronograma do pitch (dez/2026 a ago/2027).

## Limitações

A identidade visual foi aplicada só ao teclado protótipo. Não houve teste com usuários.
