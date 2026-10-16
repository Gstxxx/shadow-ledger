# IA das Agências Rivais

Código em `src/game/ai/`. Regra central (ADR 0002): a rival age **só** pelas funções do motor que o jogador usa
(`buy`, `sell`, `travel`, `openStation`, `formTeam`, `teamOperation`…), pagando os mesmos custos e causando a
mesma Saturação. A única porta é o objeto `E` em `ai/engine.ts`; os testes o embrulham para provar que nenhuma
mudança de caixa, Unidade, Estação ou Carga acontece fora dele. O que é abstraído é só o planejamento: a rival não
monta rota com várias escalas nem otimiza peso — escolhe um par compra/venda e voa.

## Ganchos no motor

| Gancho | Onde | O que faz |
| --- | --- | --- |
| `setupRivals(s)` | fim de `newGame` | Cria as rivais com `createAgency` (Célula num país nível 3+ de outro continente, plantel inicial do Preset, capital × Dificuldade). Idempotente. |
| `tickRivals(s)` | `tick`, depois de `tickAgency` | Roda a decisão de cada rival cujo horário chegou. Fora disso, O(rivais). |
| `recordAggression(s, atacante, alvo, peso)` | ações hostis entre agências | Soma rancor na rival agredida; alimenta a retaliação. |
| `GameState.ai?: AiState` | `types.ts` | Memória das RivalBrains (JSON puro, entra no save). |

Enquanto o motor não expõe `sabotageStation`, `raidVault` e `denounce`, a IA simplesmente não faz ações contra
outras agências (`E` as resolve por nome na hora da chamada).

## Ciclo de decisão

Cada rival decide a cada `interval` horas de jogo (sorteado com jitter) e logo depois de pousar. Uma decisão:

1. **Contas:** quita Manutenção em atraso; calcula o caixa arriscável (caixa − reserva da personalidade, nunca
   menos que 1,5 mês de Manutenção).
2. **Diretor preso:** paga fiança/resgate se couber; senão manda uma Equipe resgatar.
3. **Ameaças:** se a defesa não segura, escolhe suborno, advogados, reforço ou evacuação (`react`).
4. **ADM e Tensão Global:** acima de `crisisFear` a rival sai do mercado de Armas de Destruição em Massa e para de
   fazer Operações Especiais; volta quando a Tensão cai 15 pontos.
5. **Equipes:** cada Equipe com ordem voa (Voo Comercial) e executa; sem ordem, guarda/vende o que capturou e
   volta para uma Estação ou para a Escolta.
6. **Com o Diretor pousado:** vende a Carga do plano (ou entrega o Contrato) e a que sobrou; conserta máquinas;
   abre/sobe a Estação do país; contrata Pessoal (compra + alista, ou advogado); deixa guarnição na Estação.
7. **Ação hostil** contra outra agência (o jogador incluído) e **Operação Especial** contra um país.
8. **Comércio:** disputa um Contrato ou planeja um lote; compra se já está no país de compra e decola.

### Comércio

`planTrade` vê os mercados como o jogador: ao vivo onde tem Diretor ou Estação, de memória (com erro crescente)
onde viu preços nos últimos 30 dias, e por boato em poucos países. Para cada item acha a compra mais barata e a
venda mais cara, cota a fundo os 8 melhores com `quoteBuy`/`quoteSell` (a Saturação que o próprio lote causa) e
pontua lucro ÷ horas de voo, descontando Exposição para as cautelosas. Custo: O(países × itens).

ADM: no máximo 1 unidade por viagem e um negócio a cada `30 dias ÷ apetite`.

### Operações e ataques

`planOperation` só escolhe alvos que a força de Pessoal disponível vence com folga (`margin`: a IA afiada exige
~1,5× a força do alvo; a Recruta erra para mais e para menos). Evita países onde tem Estação. `planStrike` escolhe a
agência alvo por hostilidade + rancor (o jogador pesa 1,5×) e a ação pela personalidade; rancor encurta a espera
entre ataques (retaliação) e decai em ~30 dias.

## Personalidades (`ai/profiles.ts`)

| | Mercador | Mercenária | Estado-Sombra | Fantasma |
| --- | --- | --- | --- | --- |
| Foco | Comércio e Estações | Força, Armamento, roubo a banco | Estações, Informação, Neutralização | Roubo de tecnologia, discrição |
| Contra agências | Denúncia | Sabotagem, Cofre | Denúncia | Roubo de Cofre |
| ADM | nunca | sim, recua com Tensão 92 | sim, **nunca recua** | pouco, recua com 85 |
| Escolta | 3 | 6 | 4 | 3 |

Recruta só sorteia Mercador ou Fantasma.

## Dificuldade (`DIFFICULTY_AI`)

| | Recruta | Operador | Diretor |
| --- | --- | --- | --- |
| Rivais | 1 | 2 | 3–4 |
| Agressividade | 0,3 | 0,65 | 1 |
| Qualidade | 0,3 | 0,65 | 0,95 |
| Decide a cada | 24–40 h | 10–18 h | 6–11 h |
| Capital (× Preset) | 0,6 | 0,9 | 1,15 |
| Caixa por lote | 20% | 35% | 50% |

Qualidade mexe em: quantos mercados de boato vê, ruído nos preços, chance de pegar o melhor negócio em vez de um
qualquer, folga exigida antes de atacar, demora para reagir ao pouso e margem mínima para aceitar Contratos.
Nada disso muda regra do motor.

## Como ajustar

- **Rival rica/pobre demais:** `stake` e `quality` em `DIFFICULTY_AI`; `MAX_LOT` em `trade.ts`. Lembre que o
  lucro vem do mercado do motor: se o Comércio estiver generoso, o jogador ativo também ganha assim.
- **Mais/menos agressiva:** `aggression` (Dificuldade) e `operations`/`hostility` (personalidade). A chance por
  decisão é `peso × aggression × 0,35`.
- **Nova personalidade:** adicione em `PersonalityId`, `PERSONALITIES` e `PERSONALITY_ORDER`.
- **Notícias:** `news()` escreve no Relatório (`log`, não pausa). Ataques contra o jogador viram Evento pela
  própria ação do motor (`notify` para o alvo).

## Números de referência

Simulação de 365 dias, Preset "Primeiro Contrato" sem prazo, jogador parado (≈ US$ 6 mi): rivais Diretor terminam
com US$ 120–260 mi (15–35× o capital), Recruta ≈ US$ 80 mi. Uma decisão custa bem menos de 1 ms; o ano inteiro com
4 rivais roda em ~3 s no desktop. Testes em `src/game/ai/__tests__/rivals.test.ts`.
