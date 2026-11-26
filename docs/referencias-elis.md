# Referências sobre a ELiS

Fontes lidas pela dupla e o que cada uma muda no projeto. As cópias em PDF ficam fora do Git (`capturas/artigos/`).

## Fontes

1. **BARROS, M. E.** Princípios básicos da ELiS: escrita das línguas de sinais. *Revista Sinalizar*, Goiânia, v. 1, n. 2, p. 204-210, jul./dez. 2016. Disponível em: https://www.revistas.ufg.br/revsinal/article/view/38881.
   Texto da criadora da ELiS. Tem as tabelas dos 95 visografemas com o caractere da fonte de cada um e seis sinais de exemplo escritos com esses caracteres (BONITO, LIMPO, INTERVALO, SEMANA, VERDADE, OBSERVAR).
2. **FREITAS, G. G. de; BARROS, M. E.; FERNANDES, E. M. F.** Um texto escrito em Libras/ELiS: o sistema de escrita das línguas de sinais (ELiS) como recurso para registrar enunciados sinalizados. *Revista Porto das Letras*, v. 6, n. 6, p. 223-248, 2020.
   Resume a estrutura da escrita, os tipos de sinal e os diacríticos, com vários sinais escritos (as escritas estão como imagem, não como texto).
3. Obra de referência citada pelas duas: **BARROS, M. E.** *ELiS: sistema brasileiro de escrita das línguas de sinais*. Porto Alegre: Penso, 2015. Ainda não consultada.

## O que aprendemos e onde isso pesa

| Ponto | Fonte | Situação no projeto |
|---|---|---|
| Ordem fixa: configuração de dedos (polegar e demais dedos), orientação da palma, ponto de articulação, movimento. O movimento pode faltar | 1, 2 | É a ordem das 5 etapas do teclado |
| 95 visografemas: 10 de configuração de dedos (6 de polegar, 5 de demais dedos, `q` comum), 6 de palma, 35 de ponto de articulação, 44 de movimento | 1 | `elisMap.ts` conferido glifo a glifo contra a tabela de (1) em 2026-11-26: os 95 batem. Diferenças só de nome (`J` "Espaço neutro" × "corpo", `P` "Lábio superior" × "buço", `L` "Espaço ao lado do tronco" × "ao lado do corpo") |
| **Configuração de dedos por dedo:** depois do polegar pode vir mais de um glifo de demais dedos, um por dedo, e o último vale para os restantes (ex.: `qggq` = polegar fechado, indicador e médio estendidos, anelar e mínimo fechados) | 1 | **Não suportado:** o teclado e o classificador usam um glifo só para os quatro dedos |
| Tipos de sinal: monomanual, bimanual simétrico (marca no início), assimétrico (em cada grupo, mão não dominante e depois dominante), quase simétrico, com mão de apoio (o PA é da mão de apoio), composto (partes unidas por ∴). A fonte (2) acrescenta "sem as mãos" (só movimento) e soletração (só configuração de dedos) | 1, 2 | **Só monomanual** no teclado; a pipeline mede as duas mãos |
| Diacríticos: união dos dedos, contato do polegar com os dedos, lado direito/esquerdo do PA, contato simples, duplo ou triplo, repetição e alternância do movimento | 2 | **Não suportados** no teclado nem na pipeline |
| BONITO (`tgçQÄ`): o movimento `Ä` é "fechar a mão dedo a dedo (tamborilar de dedos sem repetição)" | 1 | Bate com o GIF do IFPR, que termina com a mão fechando |
