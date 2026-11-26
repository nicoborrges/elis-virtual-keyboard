# Teclado Virtual Seletor de Visografemas — ELiS

Aplicação web interativa **mobile-first** que funciona como um **Teclado Seletor Modular de Visografemas** da escrita **ELiS** (*Escrita das Línguas de Sinais*), utilizando a fonte tipográfica personalizada `ELiS-Beta.otf`.

## Arquitetura e Funcionalidades

- **Emulação Mobile Vertical (`aspect-[9/19.5]` / `max-w-md`)**:
  - **Área Superior (Visor ELiS, Modelo 3D das Duas Mãos & 5 Slots Interativos)**:
    - Palco 3D interativo em Three.js com duas mãos articuladas (espelhadas ou dominante + apoio), rotação 360° e resposta em tempo real aos visografemas selecionados.
    - Visor dinâmico renderizado com a fonte `ELiS` exibindo os sinais consolidados e o sinal em construção.
    - Barra de progresso com os **5 Slots canônicos** (`1. Polegar`, `2. Demais Dedos`, `3. Orientação`, `4. Articulação`, `5. Movimento`) com animação de subida suave (`translate-y` + `fade-in`) e edição direta ao clicar em qualquer slot.
    - Barra de ferramentas: **Enter (Tocar/Parar em loop o sinal escrito no modelo 3D)**, **Copiar Palavra** (clipboard), **Espaço** (delimitador de sinais), **Backspace** (apagar último visografema ou reabrir último sinal) e **Limpar Tudo**.

## Documentação Técnica do Modelo 3D

Consulte [`NOTAS_MODELO_3D.md`](./NOTAS_MODELO_3D.md) para detalhes sobre a abordagem procedural em Three.js implementada atualmente e alternativas para evoluir o realismo visual no futuro (malhas `.glb` rigadas do Blender, avatar com IK/blendshapes e captura via MediaPipe Hands).
  - **Área Inferior (Caixa Seletora Modular / Teclado Virtual)**:
    - Botões exibem exclusivamente os glifos visuais na fonte `ELiS-Beta.otf`, com suporte a leitores de tela (`sr-only`) e tooltip sutil.
    - **Etapa 1 (Polegar)**: 6 visografemas + atalho rápido para *Todos os dedos iguais/fechado* (`qq`).
    - **Etapa 2 (Demais Dedos)**: 5 visografemas.
    - **Etapa 3 (Orientação da Palma)**: 6 visografemas.
    - **Etapa 4 (Ponto de Articulação)**: 35 visografemas divididos em 4 subcategorias (*Cabeça*, *Tronco*, *Membros*, *Mão*).
    - **Etapa 5 (Movimento)**: 44 visografemas divididos em 3 subcategorias (*Braço*, *Dedos / Punho*, *Sem Mãos / Facial*).
    - Consolidação automática ao selecionar o 5º visografema com feedback visual (`canvas-confetti`) e retorno automático à Etapa 1.

## Estúdio de Captura (pipeline de alimentação)

Fotos e vídeos de Libras alimentam o modelo 3D: fotos calibram as poses dos visografemas e vídeos viram clipes de sinais. Abra `http://localhost:5173/estudio.html` com `npm run dev`. Detalhes em [`docs/pipeline-captura.md`](./docs/pipeline-captura.md).

## Stack Técnica

- **Vite + React 19 (TypeScript)**
- **Tailwind CSS** (`clsx` + `tailwind-merge`)
- **Lucide React** + **Canvas Confetti**
- **Fonte Tipográfica**: `ELiS-Beta.otf` (`/public/fonts/ELiS-Beta.otf`)

## Como Executar Localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run lint
npm test
npm run build
```
