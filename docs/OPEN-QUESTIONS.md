# Perguntas em aberto

Decisões que o código precisou tomar sem uma resposta no `CONTEXT.md` ou nos ADRs. Cada uma está isolada em um ponto fácil de trocar (indicado entre parênteses). Quando a sessão de design decidir, o código segue.

## Combate e Unidades

- **Unidades ainda morrem?** O glossário define **Ferida** e **Danificada** para quem perde um duelo. Implementei: cair em Combate sempre vira Ferida (Pessoal, 10 dias; 2× mais rápido numa Estação) ou Danificada (máquina, conserto de 15% do preço numa Estação Escritório+). Unidades só se perdem quando um **Agente de Influência** inimigo as converte, quando uma Célula é destruída ou rebaixada sem espaço, ou por deserção. (`units.ts: knockOut`, `combat.ts: applyCasualties`)
- **Combate Automático escolhe a Tática** com maior Prévia (exceto Negociar, que custa dinheiro). (`combatFlow.ts: beginCombat`)
- **Empate favorece quem defende**: segurar a linha até o turno 10 conta como vitória na defesa e derrota no ataque. (`combat.ts: succeeded`)
- **Recurso** de Estação Interditada é um Combate Jurídico com o Diretor presente, mas perder nunca leva à prisão do Diretor; só aumenta a multa em 25%. (`actions.ts: appeal`)

## Diretor

- **Detido**: soltura automática em 6–14 dias ou fiança imediata. **Sequestrado**: só sai com resgate pago ou resgate armado por uma Equipe; não há soltura automática. (`combatFlow.ts: captureDirector`)
- **Quem prende**: batida, processo e ataque militar são do Estado (Detido); ataque criminoso e o grupo hostil são crime (Sequestrado).

## Equipes, Cofre e Receptador

- **Receptador "na hora"**: a Equipe pode vender ao Receptador a qualquer momento enquanto carrega o item, não só no instante da captura. (`actions.ts: fenceSpoils`)
- **Reencontro com o Diretor**: ao reintegrar a Equipe à Escolta, o que ela carrega vira Carga do Diretor. (`actions.ts: mergeTeam`)
- **Equipe dizimada com Cargueiro Destacado**: o cargueiro volta à Frota na hora. (`combatFlow.ts`, fim de `resolveCombat`)
- **Capacidade do Cofre** por Nível de Estação: 1, 3, 8, 20, 50 t. Receptador paga 45% do preço-base. (`data/rules.ts: VAULT_CAPACITY, FENCE_RATE`)

## Economia e tempo

- **Ritmo do relógio**: 1× = 1 hora de jogo por segundo real; 2× e 4× multiplicam. (`ui/useGameLoop`)
- **Manutenção não paga**: metade do Pessoal deserta (os **Leais** ficam) e todas as máquinas param até quitar o atraso. (`sim.ts: monthly`)
- **Saturação**: cada unidade vendida derruba o preço local em ~2–6% (menos em economias grandes), limite de ±60%, recuperação com constante de 96 h. (`market.ts`)
- **Exposição** decai com constante de 6 dias; **Reputação** volta 0,8% por dia em direção a 0.

## Mundo

- **Tensão Global** começa em 20, decai 0,12/dia; sobe com Golpe (+12), Neutralização (+6), outras Operações (+3), países entrando em guerra (+4) e comércio de **Armas de Destruição em Massa** (+2). O mercado delas abre a partir de 75, só em países de nível 3+ em guerra, guerra civil, guerra fria ou sob sanções. (`state.ts: addTension`, `market.ts: WMD_TENSION`)
- **Traços**: 9 Traços (Sangue-frio, Leal, Modesto, Exigente, Resistente, Aprende rápido, Discreto, Persuasivo, Nervoso). Ao subir de patente (a cada 20 de experiência), a pessoa ganha um Traço positivo. (`data/traits.ts`)

## Agências Rivais

- O estado já é por **Agência** (`GameState.agencies`, índice 0 = jogador) e toda ação recebe a agência que age (ADR 0002). Reputação e Exposição são por agência; Saturação e Contratos são compartilhados. **A IA das rivais ainda não existe**: falta definir quantas por Dificuldade, como agem contra o jogador e como aparecem no mapa.

## Sandbox

- Uma Sandbox personalizada é um **Preset** montado na tela de Nova Partida (país inicial, capital, Objetivo, prazo/meta). As Unidades e Estações iniciais da Sandbox personalizada são um pacote padrão. (`ui/NewGame`)
