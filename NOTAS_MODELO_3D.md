# Notas Técnicas — Modelo 3D das Duas Mãos (Visor ELiS)

Este documento registra a arquitetura da abordagem 3D atualmente implementada no projeto **Teclado Seletor de Visografemas ELiS** e mapeia alternativas técnicas para evoluir o realismo anatômico e expressivo em futuras versões do TCC/produto.

---

## 1. Abordagem Implementada Atualmente: Rig Procedural Hierárquico em Three.js

A visualização 3D das duas mãos foi construída de forma **100% procedural em WebGL via Three.js**, encapsulada no componente [`src/components/Hands3DCanvas.tsx`](./src/components/Hands3DCanvas.tsx).

### 1.1 Arquitetura Anatômica e Cinemática
Cada mão (`createArticulatedHand`) é montada como uma árvore hierárquica de grupos (`THREE.Group`) que reproduz a cinemática direta (*Forward Kinematics*) da mão humana:

- **Raiz e Punho (`root` → `wrist`)**:
  - Controla a posição espacial da mão (usada nos deslocamentos de **Movimento** e na altura/aproximação relativa do **Ponto de Articulação**) e a rotação global da palma (**Etapa 3 — Orientação da Palma**).
  - Contém um punho estilizado com anel luminoso diferenciador: **azul-celeste (`#38bdf8`)** para a mão esquerda e **índigo (`#6366f1`)** para a mão direita.
- **Palma Esculpida**:
  - Gerada com `THREE.ExtrudeGeometry` (contorno trapezoidal arredondado com bisel suave) somada a uma eminência tenar (base do polegar) e contraste palmar/dorsal.
- **Polegar Articulado (`cmc` → `mcp` → `ip`)**:
  - Cadeia de 3 pivôs controlada pela **Etapa 1 (Configuração do Polegar)**: fechado (`q`), na palma (`w`), curvo (`e`), tridimensional (`r`), horizontal (`t`) e vertical (`y`).
- **4 Demais Dedos (`index`, `middle`, `ring`, `pinky`)**:
  - Cada dedo possui 3 pivôs encadeados (`mcp` → `pip` → `dip`) com falanges em `CapsuleGeometry`, esferas articulares (eliminando frestas ao flexionar >90°) e unhas dorsais para facilitar a leitura visual de palma vs. dorso.
  - Controlados pela **Etapa 2 (Demais Dedos)**: fechado (`q`), muito curvo (`u`), curvo (`o`), inclinado (`s`) e estendido (`g`).

### 1.2 Renderização, Interação e Reprodução em Loop (`Enter`)
- **Iluminação e Materiais**: Iluminação de estúdio em 3 pontos (`HemisphereLight`, `DirectionalLight` principal com sombras suaves, `rimLight` traseiro e `PointLight` de preenchimento) com `MeshStandardMaterial` e *tone mapping* `ACESFilmic`.
- **Interatividade 360°**: `OrbitControls` com amortecimento (*damping*) para girar as duas mãos livremente via toque ou mouse, botão de centralização da câmera e alternância entre **2 Mãos (Espelhadas)** e **1 Mão Dominante + Mão de Apoio**.
- **Animação Contínua (`Enter` / Reproduzir)**:
  - Todas as transições de ângulo usam interpolação exponencial suave (`THREE.MathUtils.lerp`).
  - Ao acionar o botão **Enter** (ou tecla `Enter` do teclado), o visor entra em modo de reprodução contínua em loop, percorrendo cada sinal escrito no buffer ELiS e executando suas configurações de dedos, orientação, altura de articulação e movimento (Etapa 5).

### 1.3 Vantagens e Limitações Atuais
- **Vantagens**:
  - Carregamento instantâneo em redes móveis (zero arquivos `.glb` de vários megabytes para baixar).
  - Controle matemático direto, determinístico e sem dependência de ativos externos ou licenças de terceiros.
  - Facilidade de depuração e extensão para novos visografemas.
- **Limitações**:
  - Estética estilizada (manequim articulado) sem deformação orgânica de pele (*skinning*).
  - Sem cabeça/tronco 3D na cena para representar visualmente pontos de articulação faciais exatos ou movimentos não manuais (expressão facial, bochechas, língua, cabeça).

---

## 2. Alternativas para Evoluir o Realismo Visual no Futuro

Caso o projeto evolua para uma visualização fotorrealista ou com avatar completo de Libras, existem três caminhos principais recomendados:

### Alternativa A — Malha 3D Anatômica Rigada (`.glb` / `.gltf`) + `GLTFLoader`
Substituir a geometria procedural mantendo exatamente a mesma lógica ELiS.

- **Como gerar**:
  1. Modelar ou obter um par de mãos anatômicas com esqueleto (*armature/bones*) no **Blender** (usando Rigify ou malhas CC0 de mãos humanas com *skin weights* suaves).
  2. Exportar no formato compacto **GLB** com compressão **Draco** (`public/models/elis-hands.glb`).
  3. Carregar a cena no Three.js via `GLTFLoader` + `DRACOLoader`.
- **Integração com o código atual**:
  - A função `getPoseFromElis()` já existente em [`Hands3DCanvas.tsx`](./src/components/Hands3DCanvas.tsx) pode ser reaproveitada diretamente, apenas vinculando `hand.wrist`, `hand.thumb.cmc/mcp/ip` e `hand.fingers[i].mcp/pip/dip` aos objetos `THREE.Bone` extraídos da malha `.glb` (ex.: `RightHandThumb1`, `RightHandIndex1`, etc.).

### Alternativa B — Avatar 3D de Meio Corpo (Busto + Mãos + Expressões Faciais)
Ideal para representar integralmente os **95 visografemas da ELiS**, incluindo **Etapa 4 (Pontos de Articulação na Cabeça/Tronco)** e **Etapa 5 (Movimentos sem as Mãos: #84 a #95)**.

- **Como gerar**:
  1. Criar um avatar humanoide estilizado ou realista no **Blender / Ready Player Me / MakeHuman** com *rig* completo de braços, mãos, pescoço, coluna e **Blendshapes / Morph Targets** faciais (padrão ARKit).
  2. Usar **Cinemática Inversa (IK — Inverse Kinematics)** nos braços (ex.: `CCDIKSolver` do Three.js) para posicionar automaticamente a mão no ponto exato do corpo correspondente à Etapa 4 (testa, queixo, nariz, tórax, ombro, espaço neutro).
  3. Mapear os visografemas #84–#95 (inflar/murchar bochechas, boca aberta, língua, piscar, afirmação/negação com a cabeça) diretamente nos *morph target influences* e rotação do osso `Head`.

### Alternativa C — Captura de Poses Reais via MediaPipe Hands / Motion Capture
Garante fidelidade linguística máxima às configurações de mão reais da Libras.

- **Como gerar**:
  1. Utilizar **Google MediaPipe Hands** (21 *landmarks* 3D por mão) com uma webcam comum para gravar um intérprete/sinalizador executando cada uma das configurações da tabela ELiS.
  2. Converter os vetores entre os 21 *landmarks* em ângulos articulares locais (Euler/Quaternions) e exportar para um dicionário JSON (`src/data/elisPoses.json`).
  3. Aplicar esses ângulos capturados diretamente no rig procedural atual ou no avatar `.glb`.

---

## 3. Quadro Comparativo

| Critério | Rig Procedural (Atual) | Malha `.glb` de Mãos (Alt. A) | Avatar + IK + Blendshapes (Alt. B) | MediaPipe MoCap (Alt. C) |
| :--- | :---: | :---: | :---: | :---: |
| **Peso / Carregamento Mobile** | Muito leve (~0 KB de assets) | Leve/Médio (0,5–3 MB) | Médio/Pesado (4–15 MB) | Leve (JSON de poses) |
| **Realismo Visual** | Médio (manequim 3D) | Alto (pele/malha contínua) | Muito alto (corpo + rosto) | Depende do rig alvo |
| **Cobertura Etapa 4 (Articulação)** | Aproximação espacial | Aproximação espacial | Exata (via IK no corpo) | Exata (com MediaPipe Pose) |
| **Cobertura Expressão Facial (#84–#95)** | Simbólica | Simbólica | Completa (Morph Targets) | Completa (Face Mesh) |
| **Complexidade de Implementação** | Baixa / Concluída | Média | Alta | Média / Alta |

---

## 4. Roteiro Rápido de Migração (Quando Evoluir para `.glb`)

1. Adicionar o arquivo `public/models/hands.glb` rigado com ossos padronizados.
2. Em [`src/components/Hands3DCanvas.tsx`](./src/components/Hands3DCanvas.tsx), substituir `createArticulatedHand()` por um carregador assíncrono usando `GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`).
3. Mapear cada osso do `.glb` para a interface `HandRig` já tipada (`wrist`, `thumb: { cmc, mcp, ip }`, `fingers: [{ mcp, pip, dip }]`).
4. Manter intactos `getPoseFromElis()`, o loop de animação `applyHandPose()`, os controles de câmera (`OrbitControls`) e o player contínuo (`Enter`).
