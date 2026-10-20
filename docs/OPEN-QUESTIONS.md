# Perguntas em aberto

Decisões que o código precisou tomar sem uma resposta no `CONTEXT.md` ou nos ADRs. Cada uma está isolada em um ponto fácil de trocar (indicado entre parênteses). Quando a sessão de design decidir, o código segue.

## Combate e Unidades

- **Unidades ainda morrem?** Cair em Combate vira Ferida (Pessoal, 10 dias; 2× mais rápido numa Estação) ou Danificada (máquina, conserto de 15% do preço numa Estação Escritório+). Quem termina o Combate de pé volta com força total (não há cura automática). Unidades só se perdem quando um **Agente de Influência** inimigo as converte, quando uma Célula é destruída ou rebaixada sem espaço, ou por deserção. (`units.ts: knockOut`, `combat.ts: applyCasualties`)
- **Combate Automático escolhe a Tática** com maior Prévia (exceto Negociar, que custa dinheiro). (`combatFlow.ts: beginCombat`)
- **Empate favorece quem defende**: segurar a linha até o turno 10 conta como vitória na defesa e derrota no ataque. (`combat.ts: succeeded`)
- **Recurso** de Estação Interditada é um Combate Jurídico com o Diretor presente, mas perder nunca leva à prisão do Diretor; só aumenta a multa em 25%. (`actions.ts: appeal`)

## Diretor

- **Detido**: soltura automática em 6–14 dias ou fiança imediata. **Sequestrado**: só sai com resgate pago ou resgate armado por uma Equipe; não há soltura automática. (`combatFlow.ts: captureDirector`)
- **Quem prende**: batida, processo e ataque militar são do Estado (Detido); ataque criminoso e o grupo hostil são crime (Sequestrado).

## Equipes

- **Equipe dizimada com Cargueiro Destacado**: o cargueiro volta à Frota na hora. (`combatFlow.ts`, fim de `resolveCombat`)
- **Interceptação de Equipe carregando itens**: ao chegar num país, Exposição +5 (+4 por tonelada) e chance de 12% + Exposição/250 (máx. 50%) de Combate Urbano contra a polícia; perder = itens apreendidos. (`sim.ts: carryingArrival`)

## Economia e tempo

- **Ritmo do relógio**: 1× = 1 hora de jogo por segundo real; 2× e 4× multiplicam. (`ui/useGameLoop`)
- **Manutenção não paga**: metade do Pessoal deserta (os **Leais** ficam) e todas as máquinas param até quitar o atraso. (`sim.ts: monthly`)
- **Saturação**: cada unidade vendida derruba o preço local em ~2–6% (menos em economias grandes), limite de ±60%, recuperação com constante de 96 h. (`market.ts`)
- **Exposição** decai com constante de 6 dias; **Reputação** volta 0,8% por dia em direção a 0.

## Mundo

- **Tensão Global**: faixas Baixa (<30), Média (30–55), Alta (55–75) e Topo (≥75, abre as Armas de Destruição em Massa). Começa em 20; decai 0,45/dia menos 0,015 por país em guerra. Sobe com Golpe (+6), Neutralização (+3), outras Operações (+1), país entrando em guerra (+2), armamento pesado vendido a quem está em guerra (+0,03 por unidade, máx. 1 por venda) e venda de ADM (+2). Mais tensão = mais mudanças políticas e Contratos maiores. **Crise Final**: 45 dias acumulados no Topo (o contador desce 2× mais rápido fora dele). Sem provocação do jogador, um ano termina na faixa Baixa/Média (Operador) ou Alta (Diretor). (`tension.ts`)
- **Traços**: 9 Traços (Sangue-frio, Leal, Modesto, Exigente, Resistente, Aprende rápido, Discreto, Persuasivo, Nervoso). Ao subir de patente (a cada 20 de experiência), a pessoa ganha um Traço positivo. (`data/traits.ts`)

## Agências Rivais

- O estado é por **Agência** (`GameState.agencies`, índice 0 = jogador) e toda ação recebe a agência que age (ADR 0002). Reputação e Exposição são por agência; Saturação e Contratos são compartilhados.
- A IA das rivais (`src/game/ai/`, outra sessão) está ligada ao motor: `setupRivals` no fim de `newGame` e `tickRivals` a cada passo do relógio. As rivais aparecem no mapa (losangos violeta nas Estações; o Diretor rival só onde a agência tem informação) e na aba Estações.
- **Ações hostis entre agências ainda não existem no motor** (`sabotageStation`, `raidVault`, `denounce`, pedidas em `docs/AI.md`). Falta decidir no design: o que cada uma faz, quanto custa, se vira Ameaça anunciada para o alvo e como o jogador revida.

## Ritmo e frequência

- **Ameaças**: chance diária por país com presença = (3% + Exposição × 0,22%) × Postura (Inimigo 1,8; Aliado 0,45) × Dificuldade (0,65 / 1 / 1,4), máximo 45%. Dá cerca de 3–6 Ameaças em 90 dias para quem fica parado. (`sim.ts: rollThreats`)
- **Operações Especiais** exigem força bem acima da Escolta inicial (roubo a banco num país nível 3 ≈ força 20; dois guarda-costas somam 4). É intencional: Operações são meio de jogo. Rever com a sessão de equilíbrio.

## Sandbox

- Uma Sandbox personalizada é um **Preset** montado na tela de Nova Partida (país inicial, capital, Objetivo, prazo/meta). As Unidades e Estações iniciais da Sandbox personalizada são um pacote padrão. (`ui/NewGame`)

## Campanha (motor)
- Capítulos 7 e 10 (Destruir): a "rede de Estações da Moravia" e a "Casa Moravia" são o Grupo Hostil do Preset, renomeado; a Agência Rival Casa Moravia roda ao lado. Derrubar Estações rivais de verdade pediria um Objetivo novo.
- Metas de Lucro e caixa dos 10 Capítulos são um primeiro chute (src/game/campaign/chapters.ts); o balanceamento ajusta.
- Bônus de caixa: 20% do Lucro, teto de 50% do caixa base do próximo Capítulo (CAMPAIGN em rules.ts), zero com prejuízo. Aguardando o balanceamento confirmar o teto.
- Reputação levada: trunca para Neutro (−31 vira −15, 40 vira 20).
- Retry: mesma Campanha, semente nova por tentativa (mesma tentativa = mesmo mundo).
