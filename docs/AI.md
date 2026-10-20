# IA das Agências Rivais

Código em `src/game/ai/`. Regra central (ADR 0002): a rival age **só** pelas funções do motor que o jogador usa
(`buy`, `sell`, `travel`, `openStation`, `formTeam`, `teamOperation`…), pagando os mesmos custos e causando a
mesma Saturação. A única porta é o objeto `E` em `ai/engine.ts`; os testes o embrulham para provar que nenhuma
mudança de caixa, Unidade, Estação ou Carga acontece fora dele. O que é abstraído é só o planejamento: a rival não
monta rota com várias escalas nem otimiza peso — escolhe um par compra/venda e voa.

## Ganchos no motor

| Gancho | Onde | O que faz |
| --- | --- | --- |
| `setupRivals(s)` | fim de `newGame` | Cria as rivais com `createAgency` (Célula num país nível 3+ de outro continente, plantel inicial do Preset, capital × Dificuldade). Quantas: `GameOptions.rivals` se o menu mandar, senão o sorteio da Dificuldade. Idempotente. |
| `tickRivals(s)` | `tick`, depois de `tickAgency`, com o relógio desbloqueado | Roda a decisão de cada rival cujo horário chegou. Fora disso, O(rivais). |
| `recordAggression(s, atacante, alvo, peso)` | ações hostis entre agências | Soma rancor na rival agredida; alimenta a retaliação. |
| `GameState.ai?: AiState` | `types.ts` | Memória das RivalBrains (JSON puro, entra no save). |

`sabotageStation`, `raidVault` e `denounce` são resolvidas por nome na hora da chamada (`E`); se o motor deixar de
expor alguma, a IA simplesmente não a usa.

## Ciclo de decisão

Cada rival decide a cada `interval` horas de jogo (sorteado com jitter) e logo depois de pousar. Uma decisão:

1. **Contas:** quita Manutenção em atraso; calcula o caixa arriscável (caixa − reserva da personalidade, nunca
   menos que 1,5 mês de Manutenção).
2. **Diretor preso:** paga fiança/resgate se couber; senão manda uma Equipe resgatar.
3. **Ameaças:** se a defesa não segura, escolhe suborno, advogados, reforço ou evacuação (`react`), nunca
   pagando mais que metade do que está em jogo (valor da Estação e de quem está nela, ou o resgate do Diretor).
4. **ADM e Tensão Global:** a rival recua (sai do mercado de Armas de Destruição em Massa e para de fazer Operações
   Especiais) quando a Tensão passa de `crisisFear` ou o contador da Crise Final do motor passa de `crisisPatience`
   dias no Topo; volta quando a Tensão cai abaixo do Topo e o contador zera. Antes disso, entre Tensão 35 e 60, a
   função `calm` corta aos poucos as Operações e a venda de armamento pesado a países em guerra (ambos sobem a
   Tensão no motor). O Estado-Sombra se contém só 80% e nunca sai do mercado de ADM.
5. **Lotação:** se uma Estação passou da capacidade (o motor deixa Unidades convertidas na defesa ou Detidas
   devolvidas passarem do limite), o excedente sai como Equipe pelo `formTeam`.
6. **Equipes:** cada Equipe com ordem voa (Voo Comercial) e executa; sem ordem, guarda/vende o que capturou e
   volta para uma Estação **com vaga para ela inteira** ou para a Escolta; sem vaga, espera onde está (correr
   atrás do Diretor custava dezenas de milhões em passagens por ano).
7. **Com o Diretor pousado:** vende a Carga do plano (ou entrega o Contrato) e a que sobrou; conserta máquinas;
   abre/sobe a Estação do país; contrata Pessoal (compra + alista, ou advogado); deixa guarnição na Estação.
8. **Ação hostil** contra outra agência (o jogador incluído) e **Operação Especial** contra um país.
9. **Comércio:** disputa um Contrato ou planeja um lote; compra se já está no país de compra e decola.

### Comércio

`planTrade` vê os mercados como o jogador: ao vivo onde tem Diretor ou Estação, de memória (com erro crescente)
onde viu preços nos últimos 30 dias, e por boato em poucos países. Para cada item acha a compra mais barata e a
venda mais cara, cota a fundo os 8 melhores com `quoteBuy`/`quoteSell` (a Saturação que o próprio lote causa) e
pontua lucro ÷ horas de voo, descontando Exposição para as cautelosas. Custo: O(países × itens).

ADM: no máximo 1 unidade por viagem e um negócio a cada `30 dias ÷ apetite`.

### Operações e ataques

`planOperation` só escolhe alvos que a força de Pessoal disponível vence com folga (`margin`: a IA afiada exige
~1,5× a força do alvo; a Recruta erra para mais e para menos). Evita países onde tem Estação. `planStrike` escolhe a
agência alvo entre as que ela consegue atacar agora (Estação operante para sabotar, Cofre com algo, olhos no país
para denunciar), pesando o jogador 2× e o rancor; a ação vem da personalidade. Espera base de 20 dias entre ataques;
o rancor encurta a espera e aumenta a vontade até um teto (`FURY_CAP` = 3), cada ataque desconta 2 de rancor do alvo,
e o rancor decai em ~30 dias. Sem o teto, rivais entravam em guerras de retaliação de ~200 ataques por ano.
Rival com menos de US$ 2 mi disponíveis não ataca ninguém: denúncias trocadas puxavam Ameaças e multas até a
falência.

## Personalidades (`ai/profiles.ts`)

| | Mercador | Mercenária | Estado-Sombra | Fantasma |
| --- | --- | --- | --- | --- |
| Foco | Comércio e Estações | Força, Armamento, roubo a banco | Estações, Informação, Neutralização | Roubo de tecnologia, discrição |
| Contra agências | Denúncia | Sabotagem, Cofre | Denúncia | Roubo de Cofre |
| ADM | nunca | sim, recua com Tensão 92 | sim, **nunca recua** | pouco, recua com 85 |
| Paciência no Topo | 0 dias | 20 dias | infinita | 6 dias |
| Escolta | 3 | 6 | 4 | 3 |

Recruta só sorteia Mercador ou Fantasma. A Origem do Diretor rival é sorteada conforme a personalidade
(`ORIGINS_BY_PERSONALITY` em `src/game/data/origins.ts`); os efeitos vêm do motor.

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
- **Rivais esquentando demais o mundo:** `CALM_FROM`/`CALM_FULL` e `calm()` em `profiles.ts`, `crisisPatience`.
- **Mais/menos agressiva:** `aggression` (Dificuldade) e `operations`/`hostility` (personalidade). A chance por
  decisão é `peso × aggression × 0,35`.
- **Nova personalidade:** adicione em `PersonalityId`, `PERSONALITIES` e `PERSONALITY_ORDER`.
- **Notícias:** `news()` escreve no Relatório (`log`, não pausa). Ataques contra o jogador viram Evento pela
  própria ação do motor (`notify` para o alvo).

## Números de referência

Simulação de 365 dias, Preset "Primeiro Contrato" sem prazo, jogador parado (≈ US$ 6 mi): rivais Diretor terminam
com US$ 130–260 mi (15–35× o capital), Recruta ≈ US$ 80 mi. Com 4 rivais na Diretor, a Tensão Global ainda
pode chegar ao Topo e à Crise Final em 90–200 dias em alguns mundos (muitas guerras desde o início seguram a
Tensão perto de 70); o teste de 365 dias zera o contador da Crise Final para isolar a IA. Uma decisão custa bem menos de 1 ms; o ano inteiro com
4 rivais roda em ~3 s no desktop. Testes em `src/game/ai/__tests__/rivals.test.ts`.
