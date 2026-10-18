# Balanceamento

Como o equilíbrio do Shadow Ledger é medido, o que foi encontrado e o que mudou. Os números saem de
simulação headless: bots jogam partidas inteiras usando as mesmas ações públicas do motor que a
interface usa (`src/game/actions.ts`, `combatFlow.chooseTactic`), com as Agências Rivais ligadas.

## Como reexecutar

```bash
npx vitest run --config tools/balance/vitest.config.ts
```

- Roda só os arquivos `tools/balance/*.bench.test.ts`, em paralelo (um por Preset, mais as partidas
  longas e as rotas fixas). O `npm test` do projeto não roda essas simulações (elas pulam sem `BALANCE=1`).
- Variáveis: `SEEDS` (sementes por célula Preset × Dificuldade × Bot, padrão 8), `LONG_SEEDS`
  (padrão 12), `LONG_DAYS` (padrão 365), `OUT` (padrão `tools/balance/out/<variante ou base>`).
- Saída: `OUT/report.md` (todas as tabelas) e `OUT/parts/*.json` (cada partida).
- `VARIANT=<lote>` mede propostas antes de pedi-las ao motor: copia `src/` para
  `node_modules/.cache/shadow-balance/<lote>`, aplica as trocas de texto de
  `tools/balance/proposals.ts` (lotes cumulativos) e redireciona os imports de `src/game` para a
  cópia. `src/` nunca é tocado.
- Comparação rápida entre execuções: `node tools/balance/compare.mjs base lote3 lote5`.
- Várias em sequência: `SEEDS=4 bash tools/balance/run-variants.sh base lote4 lote5`.

Tempo: ~15 min com 8 sementes numa máquina de 16 núcleos (o bot Operador é o mais caro: cada
Combate com o Diretor calcula a Prévia, 4 × 60 simulações, mais 200 para reestimar).

## Metodologia

### Bots (`tools/balance/bots.ts`)

| Bot | O que faz |
|---|---|
| Comerciante guloso | Arbitragem máxima com preços verdadeiros de todos os mercados (limite superior do Comércio): compra o que mais rende por hora de voo, considerando a Saturação dos dois lados, e vende onde vale mais. |
| Construtor de Estações | Comercia com os preços que viu e abre/promove Estações sempre que sobra caixa; reage a Ameaças (suborno, reforço, advogados). |
| Operador agressivo | Monta Escolta de Comandos/Operadores Táticos e faz Operações Especiais em quase toda escala (roubo a banco 70%, outra Operação 35%, Golpe 6%), aceitando Prévia ≥ 45%. ~0,5 Operação por dia: é o teto de agressividade, não um jogador médio. |
| Passivo | Não faz nada; em Combate escolhe Defensiva. |
| Aleatório | Ações ao acaso (viagem, compra, venda, Estação, Operação, Golpe…). |
| Iniciante razoável | Régua dos alvos de Dificuldade: comercia só com preços que viu (até 25 dias), erra 20% das escolhas, abre até 3 Células em países nível ≥ 3, suborna/reforça Ameaças contra Estações, nunca faz Operações. Na Caçada/Resgate arma a Escolta até a Prévia contra o grupo passar de 50–75% e persegue as pistas das Estações. |

Todos (menos Passivo e Aleatório) escolhem a Tática de maior Prévia, pagam fiança/resgate e
Manutenção atrasada quando podem.

### Métricas (`tools/balance/harness.ts`)

Por partida: lucro por dia, vitória e motivo do fim, dia e custo da primeira Estação aberta pelo bot e
payback bruto (renda atribuída pela mesma fórmula do motor ÷ investimento, incluindo promoções),
cada Ameaça (tipo, força, desfecho: subornada, sem alvo, repelida, perdida; perda concreta),
Manutenção e renda de Estações por mês, Prévia mostrada × reestimada (200 simulações, outra semente)
× resultado de cada Combate com o Diretor, Tensão Global diária (dias no Topo, sequência, Crise Final),
e checagem diária de sanidade (NaN, caixa negativo, Reputação/Exposição/Saturação fora da faixa,
Estação acima da capacidade, Frota voando sobrecarregada, estados impossíveis do Diretor) separada
entre jogador e Rivais.

Extras: rotas fixas repetidas (mesmo item, mesma origem e destino, 8 viagens, com 0, 2 e 5 dias de
espera) para medir a Saturação; partidas longas de 365 dias em Sandbox sem prazo para a Crise Final.

### Critérios-alvo

| Critério | Alvo |
|---|---|
| Estratégia dominante | Nenhum bot com o maior lucro em mais de ~50% das sementes, e Operações não muito acima do Comércio |
| Passivo | Perde todos os Objetivos de lucro |
| Dificuldade | Iniciante vence ~70% no Recruta e < 35% no Diretor |
| Primeira Estação | Payback bruto em 30–60 dias de jogo |
| Crise Final | Evitável (≈ 0% para quem não escala) mas real (ocorre para quem faz Operações sem parar) |
| Prévia | Erro < 5 pp em cada faixa de chance |
| Sanidade | Nenhum NaN, negativo ou estado impossível |

## Resultados

Três momentos, todos com Agências Rivais ligadas:

- **Antes**: motor de 16/10 (até `3529245`/`ad5b0fa`), 8 sementes por célula.
- **Motor atual**: `5658a74`, que já aplicou o lote 1 abaixo (P1–P10), 8 sementes.
- **Proposto**: motor atual + lote 2 (P11–P16) medido como variante, 8 sementes.
- **Final**: `4bd590f`, que aplicou o lote 2. Verificação com 8 sementes reproduz o proposto: Iniciante
  75/50/13% (Primeiro Contrato), 88/63/0% (Mediterrâneo), 100/100/13% (Pacífico), 88/13/0% (Sahel),
  75/25/0% (Andes), 75/50/0% (Linha Vermelha); Passivo 0% em todos; quem mais lucra por semente:
  Guloso 55%, Operador 23%, Iniciante 20%; letalidade 13/30/51%; Prévia ≤ 3,5 pp; Crise Final 0% para
  pacíficos e 100% para o Operador hiperagressivo (dia 87–120).

### Vitória do bot Iniciante (régua da Dificuldade) — Recruta / Operador / Diretor

| Preset | Antes | Motor atual | Proposto |
|---|---|---|---|
| Primeiro Contrato (lucro, 90 d) | 100 / 100 / 88% | 100 / 100 / 88% | **75 / 50 / 13%** |
| Corredor do Mediterrâneo (lucro, 120 d) | 100 / 100 / 100% | 100 / 100 / 100% | **88 / 63 / 0%** |
| Frio no Pacífico (lucro, 180 d) | 100 / 100 / 100% | 100 / 100 / 100% | **100 / 88 / 13%** |
| Caçada no Sahel (eliminar grupo) | 0 / 0 / 0% | 88 / 25 / 13% | 88 / 25 / 0% |
| Resgate nos Andes | 0 / 0 / 0% | 75 / 25 / 0% | 75 / 25 / 0% |
| Linha Vermelha (eliminar grupo) | 25 / 0 / 0% | 63 / 38 / 0% | 75 / 38 / 0% |
| Conta Numerada (US$ 25 M, sem prazo) | 100% em 6–12 dias | 100%, dias 24–75 / 27–124 / 47–220 | 100%, dias 28–77 / 28–107 / 48–232 |

Passivo: com "lucro > 0" vence até 38% no Primeiro Contrato Recruta e 50% no Mediterrâneo Recruta
(só com a renda das Estações iniciais, mais fortes depois de P6); **0% em todos os Objetivos de lucro** no proposto.

### Lucro mediano (US$ M) e estratégia dominante

| | Antes | Motor atual | Proposto |
|---|---|---|---|
| Guloso, Primeiro Contrato Recruta (capital 5 M) | 50,8 | 20,1 | 19,6 |
| Iniciante, idem | 29,3 | 9,6 | 8,0 |
| Operador agressivo, idem | 172,4 | 151,5 | 60,3 |
| Guloso, Frio no Pacífico Recruta (capital 25 M) | 1.091 | 544 | 451 |
| Quem tem o maior lucro em cada semente | Guloso 55%, Operador 27% | Guloso 49%, Operador 39% | Guloso 57%, Operador 26%, Iniciante 17% |

O Guloso usa preços verdadeiros de todos os mercados: é o teto do Comércio, não um jogador. Mesmo
assim não vence tudo (Caçada/Resgate no Diretor 0%, Pacífico no Diretor 50%).

### Outros critérios

| Critério | Antes | Proposto | Alvo |
|---|---|---|---|
| Payback bruto da 1ª Estação (mediana por bot) | 60–80 dias | 42–65 dias (Iniciante 48) | 30–60 |
| Letalidade das Ameaças (perda por ameaça; Recruta / Operador / Diretor) | 41 / 65 / 76% | 13 / 30 / 51% | crescente |
| Crise Final, partidas longas de bots pacíficos | 100% (dia 75–230) | 0% | ≈ 0% |
| Crise Final, partidas longas do Operador hiperagressivo | 100% (dia ~57) | 100% (dia 101–275) | real |
| Crise Final, bot Passivo no Primeiro Contrato Diretor (90 d) | 75% | 0% | 0% |
| Prévia: maior desvio entre faixas | 3,0 pp | 1,7 pp | < 5 pp |
| Rota fixa repetida, 2ª viagem sem espera | 34% do lucro da 1ª | −15% (prejuízo) | deve cair |
| NaN / caixa negativo / Reputação, Exposição ou Saturação fora da faixa | 0 | 0 | 0 |

Prévia × resultado (proposto, 15.188 Combates com o Diretor):

| Faixa da Prévia | Combates | Prévia média | Reestimada (200 sim.) | Vitória real |
|---|---|---|---|---|
| 0–20% | 1.708 | 3% | 3% | 2% |
| 20–40% | 278 | 29% | 27% | 30% |
| 40–60% | 2.244 | 52% | 50% | 52% |
| 60–80% | 2.808 | 69% | 67% | 68% |
| 80–100% | 8.150 | 95% | 94% | 93% |

A Prévia (60 simulações) superestima ~1–2 pp por "maldição do vencedor": o bot escolhe a Tática de
maior estimativa ruidosa. A reestimativa independente coincide com o resultado real.

## Decisões e propostas

Todas as trocas exatas estão em `tools/balance/proposals.ts` (arquivo, texto antigo → novo, motivo).

### Lote 1 — aplicado pelo motor em `5658a74`

| Id | Mudança | Por quê / efeito medido |
|---|---|---|
| P1 | `market.ts` BUY_SPREAD 1,04 → 1,07; SELL_SPREAD 0,94 → 0,91 | Ida e volta custava 10% contra margens de 50–150% por viagem. |
| P2 | `market.ts` passo de Saturação 0,05/0,07 → 0,15/0,20 | Cada mercado absorve um terço do volume antes de a margem sumir. |
| P3 | `market.ts` SATURATION_RECOVERY_H 96 → 240 | Rota repetida em menos de ~10 dias dá prejuízo. |
| P4 | `market.ts` drift inicial 0,85–1,15 → 0,92–1,08; passo ±0,04 → ±0,03; limites 0,72–1,30 → 0,87–1,15 | Só o ruído criava ~30 pp de margem entre países. P1–P4: Guloso no Primeiro Contrato 51 → 20 M. |
| P5 | `combat.ts` defesas fixas sempre presentes (`if (setup.fort)`) | Bug: com Unidades, a defesa fixa sumia e linhas vazias eram rompidas; guarnecer piorava (2 Operadores Táticos 1% vs Estação vazia 13%). |
| P6 | `rules.ts` defesa fixa e renda das Estações (Célula 2 → 4 e 3,5 → 5 mil/dia; Casa Segura 3 → 5 e 9 → 13 mil; Escritório 4 → 5–6 e 24 → 32 mil; Complexo 4–5 → 6–7 e 52 → 64 mil; Base 4–6 → 6–8 e 105 → 120 mil) | Letalidade das Ameaças 46/63/73% → 13/29/52%; payback da 1ª Estação para 42–65 dias. |
| P7 | `combatFlow.ts` multa de Interdição 120 mil → 40 mil por nível do país | A multa da Célula (447 mil) passava do custo dela (250 mil). |
| P8 | `state.ts` força do grupo hostil 22 + 10·desafio + 6·(dif−1) → 12 + 6·desafio + 5·(dif−1) | Grupo de 42–64 em 9 Unidades veteranas era invencível em 10 turnos (≤ 5% com +6 Comandos). |
| P9 | `combatFlow.ts` roubo a banco 450 mil → 150 mil por nível | Operador lucrava 5–8× o Comerciante. |
| P10 | `combatFlow.ts` bônus do Golpe 800 mil → 400 mil por nível | Idem. |

O motor também mudou a Tensão Global por conta própria (Operações +1/+3, Golpe +6, decaimento
−0,45 + 0,015 por guerra), o que resolveu a Crise Final para quem não escala.

### Lote 2 — aplicado pelo motor em `4bd590f`

| Id | Mudança | Efeito medido |
|---|---|---|
| P11 | `items.ts` STEAL_TABLE `['intel','docs','secret','tech','space']` → `['intel','docs','docs','secret','tech']` | Operador 151 → 60 M (Primeiro Contrato Recruta); deixa de ser a estratégia de maior lucro. |
| P12–P13 | `objective.ts` "Lucro no prazo" vence com `p >= target × [0,8 / 0,95 / 1,1]` em vez de `p > 0` | Dificuldade passa a separar resultados; Passivo não vence mais. Texto de derrota e briefing precisam mostrar a meta. |
| P14–P16 | `rules.ts` `target` 7 M (Primeiro Contrato), 110 M (Mediterrâneo), 400 M (Pacífico) | Calibradas entre o ~15º percentil do Iniciante no Recruta e o ~85º no Diretor. |

### Não proposto / em aberto

- **Escala absoluta do Comércio**: mesmo com P1–P4, Presets de capital e Frota grandes multiplicam o
  capital 15–30× (Mediterrâneo, Pacífico). Saturação mais forte rendeu pouco a mais; preferimos metas
  por Preset a estrangular o Comércio. Se a escala incomodar no texto, o próximo passo é reduzir a
  capacidade dos cargueiros grandes ou fazer a Saturação vazar para países vizinhos.
- **Crise Final do jogador agressivo**: o alvo era 10–25% das partidas longas de bots agressivos. O
  único bot agressivo faz ~0,5 Operação por dia o ano todo e chega à Crise em 100% (dia 101–275 no
  proposto); os pacíficos em 0%. A Crise é evitável e real, mas a taxa intermediária depende de um
  jogador "moderadamente agressivo" que não modelamos. O decaimento proporcional
  `-(0.3 + tensão × 0.01) + guerras × 0.01` (id T1) atrasa a Crise do Operador sem afetar os demais.
- **Construtor de Estações** perde as metas de lucro dos Presets grandes (Estações rendem ~3,5 M/mês
  contra ~27 M/mês do Comércio): Estações são suporte (informação, defesa, Cofre), não fonte principal.
- **Bugs encontrados** (fora do balanceamento): Agências Rivais deixam Estações acima da capacidade
  (milhares de dias-Estação por grade; enviado à sessão das Rivais); a Frota do jogador ficava
  sobrecarregada em voo quando um cargueiro parava por Manutenção não paga (~3% das partidas; corrigido
  em `4bd590f`: cargueiro em voo não para);
  conversões em Combate podem passar a capacidade de uma Célula (~1,5% das partidas).

## Custo de entrada de Contratos e Operações (backlog item 4, 17/10)

Pedido: "missões e Contratos caros demais". Medido com `tools/balance/costs.bench.test.ts`
(Primeiro Contrato, 30 sementes, primeiros 30 dias; caixa inicial 5,0 / 4,0 / 3,4 M):

```bash
npx vitest run --config tools/balance/vitest.config.ts costs
VARIANT=lote7 npx vitest run --config tools/balance/vitest.config.ts costs
```

### Antes → depois (lote 7, proposto ao motor)

| Contratos oferecidos (Recruta / Operador / Diretor) | Antes | Lote 7 |
|---|---|---|
| Custo mediano do lote (comprar no mercado mais barato) | 2,01 / 1,96 / 2,05 M | 1,25 / 1,26 / 1,27 M |
| Pagamento mediano | 3,17 / 3,34 / 3,33 M | 1,79 / 1,77 / 1,78 M |
| Margem mediana | 66 / 54 / 55% | 43 / 42 / 37% |
| Ofertas com custo ≤ 25% do caixa | 20 / 11 / 9% | 50 / 36 / 33% |
| Ofertas com custo ≤ 50% do caixa | 60 / 51 / 36% | 95 / 84 / 71% |
| Ofertas que custam mais que o caixa inteiro | 22 / 21 / 30% | 0 / 1 / 1% |

| Reforço para Prévia ≥ 60% com a Escolta inicial (Recruta) | Antes | Lote 7 |
|---|---|---|
| Roubo a banco, país nível 2–3 | +3 Op. Táticos (0,45 M) | igual |
| Neutralização, nível 3 | +4 Comandos (1,28 M) | +3 (0,96 M), e paga 0,75 M |
| Neutralização, nível 5 | impossível (> 9) | +7 Comandos (2,24 M) |
| Golpe, nível 2 | impossível (> 9) | +3 Comandos (0,96 M) |
| Golpe, nível 3 | impossível | +7 Comandos (2,24 M) |

Reações a Ameaças (suborno 0,07–0,5 M, advogados 0,12–0,3 M, reforço 0,10–0,25 M; ≤ 15% do
caixa) e fiança (0,39–1,43 M) não precisaram mudar.

| Id | Mudança | Motivo |
|---|---|---|
| P17 | `sim.ts` rollContracts: orçamento `0.5–3.5 M` → `0.2–2 M` (× nível e Tensão, como antes), calculado antes do item, e só itens com `price <= budget` | Com qty mínima 1, um caça ou tanque estourava o orçamento: 1 em cada 4–5 ofertas custava mais que o caixa inicial. |
| P18 | `actions.ts` operationStrength: Neutralização `8 + 5·nível` → `6 + 4·nível`; Golpe `12 + 8·nível` → `10 + 6·nível` | Pediam mais Comandos do que cabem na grade em qualquer país nível ≥ 3. |
| P19 | `combatFlow.ts` Neutralização bem-sucedida paga `250 mil × nível` | Era "paga pela oposição" sem pagar nada: só risco. |

Efeito na grade completa (4 sementes, base × lote 7): Iniciante e Passivo sem mudança fora do ruído
(Passivo segue 0% nas metas), Guloso −10 a −20% no Primeiro Contrato por Contratos menores,
Operador agressivo +10 a +30% de lucro e Crise Final alguns dias antes (dia 75–106 contra 87–120),
porque passa a fazer Neutralizações.

### Curva de custo para novas missões (Contratos de combate, item 3)

Em fração do caixa inicial do Preset (C):

- Entrada (aceitar ou montar a força): 0,1–0,3 C no começo, 0,3–0,6 C no meio; nunca mais que C nos
  primeiros 30 dias, e pelo menos 1 em cada 3 ofertas abaixo de 0,25 C.
- Força inimiga vencível (Prévia ≥ 60%) com a Escolta inicial + até 3 reforços: ~13–20 no Recruta,
  ~18–25 no Diretor (a faixa de roubo a banco/tecnologia em país nível 2–3).
- Pagamento 1,3–1,6× a entrada (margem de 30–60%, igual aos Contratos de comércio); a falha custa a
  entrada mais a fiança.
- Equipamento do Arsenal (item 5): +1 de força por ~20–30% do preço de um Operador Tático
  (~30–45 mil); comum 15–60 mil, topo até 600 mil e nunca acima do preço da Unidade que o carrega.
