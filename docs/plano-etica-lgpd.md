# Plano — Ética em Pesquisa e LGPD nos testes do Acme

> **Status:** rascunho (2026-11-26). Não é parecer jurídico. Validar com os orientadores, o **CEP/UFG** e o **encarregado de dados (DPO) da UFG** antes de executar.

## 1. Por que isso é necessário

Os testes do Acme envolvem **pessoas** (surdas e não surdas), **observação de sessões**, **telemetria** (tempo, precisão, erros) e **login com conta Google**, e os resultados vão para um **TCC publicado**. Isso caracteriza **pesquisa com seres humanos** e **tratamento de dados pessoais**. Portanto:

- **Ética:** o protocolo precisa ser aprovado por um Comitê de Ética em Pesquisa (CEP), via **Plataforma Brasil**, **antes** de qualquer coleta.
- **LGPD (Lei 13.709/2018):** coleta, armazenamento e uso dos dados precisam de base legal, finalidade clara, minimização e segurança.

## 2. Prazo — ação urgente

Pelo cronograma do pitch, os **testes iniciais são em mar–abr/2027**. A tramitação no CEP costuma levar semanas, muitas vezes mais de um mês, e pode voltar com pendências.

| Quando | Ação |
|---|---|
| **até 10/dez/2026** | Conversar com os orientadores; definir pesquisador responsável; levantar com o CEP/UFG o enquadramento e os modelos de documento |
| **até 20/dez/2026** | Redigir projeto, TCLE (português + Libras), roteiro de sessão e instrumento de coleta |
| **início de jan/2027** | Submeter na Plataforma Brasil |
| **jan–fev/2027** | Responder pendências; implementar no jogo os requisitos técnicos da §6 |
| **mar/2027** | Iniciar testes **somente após o parecer de aprovação** |

> Se a aprovação atrasar, os testes atrasam. Testes informais de usabilidade só com a própria equipe podem seguir sem coleta de dados de terceiros.

## 3. Enquadramento ético (a confirmar com o CEP)

- **Normas prováveis:** Resolução CNS **510/2016** (pesquisa em Ciências Humanas e Sociais, adequada a testes de uso e observação com risco mínimo) e, no que couber, Resolução CNS **466/2012**.
- **Pesquisador responsável:** **Nicolas Josep Silveira Borges** (decidido). ⚠️ Muitos CEPs exigem que pesquisas de graduação tenham um **docente** como responsável, com o aluno na equipe. Confirmar com o CEP/UFG logo no primeiro contato. Se não for aceito, o orientador assume e o Nicolas fica como pesquisador assistente.
- **Público:** **somente adultos (18+)**. Não haverá menores.
- **Sessões não filmadas.** O registro será feito por notas do observador e pela telemetria do jogo.
- **Riscos (mínimos) a declarar:** cansaço e frustração com os puzzles, constrangimento ao errar e vazamento de dados.
- **Mitigações:** pausas livres, direito de parar a qualquer momento sem prejuízo, sessão sem avaliação "certo/errado" da pessoa, dados pseudonimizados.
- **Benefícios:** contato com ELiS/Libras e contribuição para material acessível.

## 4. Documentos para a submissão

- [ ] **Projeto de pesquisa** detalhado: objetivos, hipóteses, método, público, critérios de inclusão e exclusão, análise de dados
- [ ] **TCLE**: termo de consentimento **bilíngue**, em português escrito **e vídeo em Libras** (gravado pela monitora da Letras ou intérprete). A Res. 510/2016 admite registrar o consentimento em formatos além do escrito; confirmar com o CEP
- ~~TALE + TCLE dos responsáveis~~ — **não se aplica** (sem menores)
- ~~Termo de uso de imagem/vídeo~~ — **não se aplica** (sem filmagem). Se decidirem gravar a **tela** do jogo, avaliar com o CEP se precisa de cláusula específica.
- [ ] **Roteiro da sessão observada** (sem instrução textual, conforme o pitch) e **ficha de anotação do observador**
- [ ] **Instrumento de coleta**: lista exata do que a telemetria registra (ver §5)
- [ ] **Termo de anuência** da instituição ou local onde os testes ocorrerão
- [ ] Folha de rosto, cronograma e orçamento (provavelmente custo zero), conforme exigido pela Plataforma Brasil

**Acessibilidade das sessões:** intérprete de Libras ou a monitora presente. Explicações e retirada do consentimento possíveis em Libras.

## 5. LGPD — como tratar os dados

### 5.1 Papéis
- **Controlador:** provavelmente a **UFG** (instituição de pesquisa), via pesquisador responsável. Confirmar.
- **Encarregado (DPO):** o da UFG. Consultá-lo sobre hospedagem e política de privacidade.

### 5.2 Bases legais (a validar)
- Dados pessoais comuns: **art. 7º, IV** (estudos por órgão de pesquisa, com anonimização sempre que possível).
- **Dado sensível:** a informação "pessoa surda / condição auditiva" é **dado referente à saúde**, portanto sensível. Base: **art. 11, II, "c"** (estudos por órgão de pesquisa) e/ou consentimento específico.
- O **TCLE ético não substitui** a base legal da LGPD, mas os dois devem ser coerentes. O aviso de privacidade pode ficar dentro do TCLE.

### 5.3 Minimização: o que coletar

| Coletar | Não coletar na telemetria |
|---|---|
| ID de participante **pseudônimo** (ex.: `P-017`) | Nome, e-mail, foto do Google |
| Grupo: surdo / ouvinte / especialista (com consentimento específico) | Diagnóstico, grau de perda auditiva (a menos que a pesquisa exija) |
| Faixa etária (não a data de nascimento) | Data de nascimento, CPF, endereço |
| Eventos: visografema escolhido, sinal conjurado, acerto/erro, tempos, puzzle, timestamps | Conteúdo de outras abas ou do dispositivo |
| Tipo de dispositivo e navegador (genérico) | IP armazenado junto da telemetria |

### 5.4 Login Google × dados de pesquisa
- **Separar identidade e pesquisa:** a conta Google fica numa tabela de usuários. A telemetria usa só o **ID pseudônimo**. A tabela que liga as duas tem acesso restrito à equipe e pode ser apagada ao fim da pesquisa, tornando os dados anônimos.
- Para as **sessões de teste**, avaliar entrar **sem Google** (código de sessão entregue na hora). Isso reduz os dados coletados e não exige que o participante tenha conta.

### 5.5 Segurança, retenção e direitos
- Hospedagem na **UFG**, HTTPS, banco com acesso por perfil, sem credenciais no repositório, backups.
- **Retenção:** as resoluções do CNS pedem guardar os dados da pesquisa por **no mínimo 5 anos** após o término. Confirmar e registrar no projeto. Guardar a versão anonimizada.
- **Direitos do participante:** retirar o consentimento a qualquer momento e pedir a **exclusão** dos seus dados (prever o fluxo).
- **Publicação:** só dados agregados e anonimizados. Nenhum vídeo ou rosto sem autorização específica.

## 6. Requisitos técnicos para o jogo (backlog)

- [ ] **Modo pesquisa** separado do modo jogo normal (telemetria só liga com consentimento registrado)
- [ ] **Tela de consentimento** antes da 1ª coleta, com vídeo em Libras e aceite explícito. Guardar a versão do termo e a data do aceite
- [ ] **ID pseudônimo** gerado no servidor; telemetria nunca grava e-mail ou nome
- [ ] **Esquema de eventos** versionado (documentar cada campo, que deve bater com o instrumento de coleta da §4)
- [ ] Endpoint e rotina para **exportar** (CSV anonimizado) e **excluir** os dados de um participante
- [ ] **Aviso de privacidade** acessível no jogo (em Libras no futuro, conforme o pilar visual)
- [ ] Logs do servidor sem dados pessoais desnecessários

## 7. Decisões deste plano

**Decididas (2026-11-26)**
- Pesquisador responsável: **Nicolas** (confirmar se o CEP aceita graduando)
- Participantes: **somente maiores de 18 anos**
- Sessões **não serão filmadas**

**Pendentes**
1. **Quantos** participantes e **onde** serão os testes (UFG, associação de surdos, outro)? O CEP vai pedir número estimado e local, com termo de anuência.
2. Testes com **login Google** ou com **código de sessão**?
3. Qual dado de "grupo" é realmente necessário (surdo/ouvinte/especialista, nível de Libras/ELiS)?
4. Haverá **gravação de tela** do jogo durante as sessões?
