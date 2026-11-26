---
name: diario-metodologia
description: |
  Registra no diário de metodologia do TCC (docs/metodologia/) o que foi feito no projeto Acme e como foi feito, com evidências, para virar o capítulo de metodologia. Use ao concluir qualquer alteração antes do commit, ao fechar uma etapa ou experimento da pipeline de captura, ao tomar uma decisão de projeto, ou quando pedirem "registre", "documente a metodologia" ou "atualize o diário".
---

# Diário de metodologia

O diário guarda **o que** a dupla fez, **como** fez e **com que evidência**, no momento em que acontece. No fim do TCC ele vira o capítulo de metodologia e permite que outra pessoa reproduza cada passo. Memória de conversa não serve para isso: a entrada precisa estar no repositório, junto com o commit que ela descreve.

## Quando escrever

- Ao concluir uma alteração, **antes do commit**. A entrada vai no mesmo commit da mudança.
- Ao terminar um experimento ou teste, mesmo que tenha falhado. Falhas e becos sem saída são metodologia.
- Ao tomar ou mudar uma decisão de projeto (registrada também no `CLAUDE.md`).

Não escreva entrada para mudança trivial (erro de digitação, ajuste de cor). Nesse caso, acrescente uma linha a uma entrada existente do mesmo dia e tema.

## Onde

- Uma entrada por tema e dia: `docs/metodologia/AAAA-MM-DD-tema-curto.md` (tema em minúsculas, com hífens).
- Se já existe entrada do mesmo tema no mesmo dia, **acrescente** a ela em vez de criar outra.
- Atualize a tabela em `docs/metodologia/README.md` (data, entrada, etapa do cronograma, commits).

## Modelo da entrada

```markdown
# <Título que diz o que foi feito>

- **Data:** AAAA-MM-DD
- **Etapa do cronograma:** <ex.: Dez 2026 — mecânica base / dicionário / pipeline>
- **Branch e commits:** `<branch>`, `<hash curto>` <assunto>
- **Arquivos principais:** `caminho/arquivo.ts`, ...

## Objetivo
Uma ou duas frases: que problema ou pergunta esta etapa ataca.

## Como foi feito
Passos na ordem em que aconteceram, com o bastante para reproduzir:
ferramentas e versões, parâmetros, algoritmos, fontes de dados, comandos.

## Decisões
O que foi escolhido, as alternativas consideradas e por que foram descartadas.

## Resultados e evidências
Números medidos, testes que passaram, o que foi visto no navegador.
Diga exatamente o que foi verificado e com que dado.

## Problemas e correções
O que deu errado, como foi percebido e como foi resolvido.

## Limitações
O que ainda não foi validado e o que pode invalidar o resultado.

## Próximos passos
Só o que de fato ficou pendente.
```

Seções sem conteúdo podem ser omitidas. Não invente seção para preencher o modelo.

## Regras

1. **Só fatos verificáveis.** Tire números, versões e hashes de `git log`, da saída dos testes, do build ou do que foi medido nesta sessão. Se algo não foi verificado, escreva que não foi. Nunca estime um resultado como se tivesse medido.
2. **Reprodutível.** Cite caminhos de arquivo, comandos e parâmetros exatos. Prefira "suavização One Euro (minCutoff 1,5; beta 0,3)" a "suavização dos dados".
3. **Registre o que falhou.** Uma abordagem descartada, com o motivo, vale tanto quanto a que ficou.
4. **Sem dados pessoais.** Nunca escreva nome de participante, de quem sinalizou ou de quem gravou. Use funções ("monitora da Letras", "participante P03"). Nunca inclua imagem ou vídeo de pessoa. Ver `docs/plano-etica-lgpd.md`.
5. **Fontes externas.** Para dados de terceiros (ex.: GIFs do IFPR), registre a URL, a data de acesso e a situação da licença.
6. **Português do Brasil**, texto corrido e simples, voz ativa, primeira pessoa do plural ("implementamos", "medimos").
7. **Revise a prosa com a skill `humanizer`** em modo embutido antes de salvar: tire frases de efeito, tríades forçadas, travessões e negrito decorativo. Mantenha intactos números, código, caminhos e comandos.
8. A entrada vai **no mesmo commit** da mudança que ela descreve. Se a entrada for escrita depois, cite os hashes dos commits.

## Fontes para preencher

- `git log --format='%h %ad %s' --date=short` e `git show --stat <hash>`
- Saída de `npm test`, `npm run lint` e `npm run build` (tamanhos do bundle)
- `CLAUDE.md` (decisões), `docs/pipeline-captura.md`, `docs/plano-etica-lgpd.md`, `NOTAS_MODELO_3D.md`
