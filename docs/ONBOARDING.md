# Onboarding: Analista, objetivo guiado e Tutorial

Quem nunca jogou se perdia: muitos painéis, nenhuma ordem. O onboarding tem três peças, todas fora do motor:

| Peça | Código | O que faz |
| --- | --- | --- |
| **Analista** | `src/ui/analyst/AnalystLayer.tsx` | Balão compacto num canto do mapa. Comenta Eventos em tempo real e explica cada sistema **na primeira vez** que ele aparece. Lembra o que já explicou entre partidas. Silenciável. |
| **Objetivo guiado** | `src/game/tutorial/guide.ts` | Em qualquer partida nova: Comprar → Voar → Vender → Abrir Estação → Aceitar Contrato. Cada passo termina sozinho pelo estado do jogo; um anel destaca o elemento certo. |
| **Preset Tutorial** | `src/game/tutorial/preset.ts` | "Tutorial: Primeira Rota", 30 dias, sem Estação inicial. Equipes, Operações, Agências Rivais e Tensão Global ficam desligadas até o fim do guia. |

## Analista

- **Tópicos** (`src/game/tutorial/topics.ts`): Frota/espaço, Comprar, Voar, Saturação, Estação, Reputação/Exposição, Ameaça, Combate (Prévia/Tática), Manutenção, Equipe, Contrato, Agência Rival, Tensão Global. `presentTopics(s)` diz quais estão em cena só lendo o estado (ex.: Ameaça quando há uma anunciada; Saturação depois da primeira venda; Tensão Global a partir de 55). A UI mostra o primeiro em cena que o jogador ainda não viu.
- **Memória entre partidas**: `localStorage['sl.analyst']` = `{ seen: TopicId[], muted }` (`src/ui/analyst/memory.ts`). `analystMemory.reset()` faz a Analista explicar tudo de novo.
- **Pausa**: um tópico novo pausa o relógio uma vez; "Entendi" marca como visto e devolve o relógio se foi ela que pausou.
- **Eventos**: com um Evento na tela, a Analista comenta numa frase pelo tipo e tom (`analyst.event.*`), com a expressão certa (`neutral`, `concerned`, `alert`, `pleased`).
- **Prioridade do balão**: Evento > comemoração do passo concluído > tópico novo.
- **Silenciar**: some o balão e fica só um retrato de 44 px para reativar. O objetivo guiado continua (tem "Pular guia" próprio).
- **Spotlight**: enquanto explica um tópico, destaca o elemento dele (`TOPIC_TARGETS`); senão, o alvo do passo (`STEP_TARGETS`). Os alvos são atributos `data-tour` na tela de jogo (`map`, `market`, `buy`, `sell`, `fly`, `fleet`, `open-station`, `speed`, `tab-contracts`, `tab-threats`, `drawer-left`, `drawer-right`). Vale o primeiro visível da lista, então no celular a gaveta fechada (`drawer-left`) é destacada no lugar do botão escondido.

Se nenhum alvo do passo está à vista e há um diálogo aberto por cima (ex.: comprou no Mercado e agora precisa voar pelo mapa), o anel vai para o botão "Fechar" do diálogo. O anel fica acima dos modais (z-index 310), recortado pelo contêiner com rolagem; o alvo principal abaixo da dobra rola para a vista uma vez por passo.

### Layout

O balão fica no canto inferior esquerdo da área do mapa, acima do Relatório, com largura de até 360 px (300 px em telas baixas). Fica acima do scrim de Eventos e do Combate (z-index 55), mas só o balão e o chip do objetivo capturam cliques, então o resto da tela continua jogável. Em telas com altura ≤ 520 px (celular deitado, ~640×360), o retrato encolhe para 40 px e o texto corta em 4 linhas.

## Objetivo guiado

`updateTutorial(s)` roda a cada render da tela de jogo (barato) e guarda em `GameState.tutorial`: passo atual, marca do momento em que ele começou e passos concluídos. Como os passos terminam:

| Passo | Termina quando |
| --- | --- |
| `buy` | a Carga aumenta |
| `fly` | a Frota decola (ou o Diretor já está em outro país) |
| `sell` | pousado, a Carga diminui |
| `station` | o número de Estações aumenta |
| `contract` | um Contrato é aceito, ou depois de 7 dias de jogo (as ofertas são aleatórias) |
| `free` | fim; libera os sistemas do Tutorial |

"Pular guia" (`skipGuide`) também encerra o Tutorial. O estado vai no save junto com a partida.

## Preset Tutorial e sistemas travados

`PresetDef.locked` lista os sistemas desligados; `isLocked(s, sys)` responde "travado e o Tutorial ainda não terminou". O motor consulta:

- `teams`: `formTeam` recusa ("Disponível depois do Tutorial.");
- `operations`: `startOperation`, `teamOperation`, `startCoup` recusam;
- `tension`: `addTension` e o contador da Crise Final não mexem;
- `rivals`: `setupRivals` não cria rivais; `unlockSystems` as cria quando o guia termina.

## Textos

Área i18n `analyst.*` em `src/i18n/pt-BR/analyst.ts` e `src/i18n/en/analyst.ts` (registrada nos índices). A UI lê esses dois arquivos direto (`src/ui/analyst/strings.ts`) com o idioma atual. Tom: thriller sério, frases curtas, vocabulário do glossário (en: Forecast, Rival Agency, Global Tension…).

## Integração na tela de jogo

```tsx
import { AnalystLayer } from '../analyst';
// dentro de .game, depois de <GameOver/>:
<AnalystLayer onOpenDrawer={(side) => setDrawer(side)} />
```

### Validado (build de produção local, `?safe=62,0,34,0`)

- **Em pé, 440×956:** chip e balão acima do Relatório e da barra de ações; anel na lista do Mercado, em "Comprar N" (rolado para a vista) e no "Fechar" do modal.
- **Em pé, 360×640:** o chip cabe acima do Relatório.
- **Deitado, 956×440:** o balão fica abaixo das camadas do mapa e acima do Relatório; o chip recolhe enquanto ela fala.

## Harness de desenvolvimento

`npx vite` e abrir `/src/ui/analyst/dev.html`: tela de jogo com o Preset Tutorial e a Analista por cima.

- `?new` começa partida nova (senão continua o save);
- `?reset` esquece os tópicos vistos;
- `?preset=<id>` e `?seed=n` escolhem Preset e semente.

Um shim marca `data-tour` pelo texto dos botões onde a tela real ainda não marca.

## Testes

`src/game/tutorial/__tests__/tutorial.test.ts`: sistemas travados no início; guia do primeiro clique até a liberação (com rivais criadas no fim); Contrato conclui o passo na hora; pular encerra o Tutorial; estado no save; tópicos aparecem conforme o jogo.

## Decisões tomadas sem consulta (padrões; fácil mudar)

- **Pausa:** um sistema novo pausa o relógio uma vez; Eventos já pausam pelo motor. Comemorações de passo não pausam.
- **Comemoração:** fica no balão até o jogador dispensar (sumir sozinha trocava o botão sob o dedo).
- **Guia em toda partida nova**, não só no Tutorial. "Pular guia" vale para aquela partida.
- **Passo do Contrato:** termina sozinho depois de 7 dias de jogo. No Tutorial as ofertas costumam ser grandes demais para um avião de 8 t, e a dica manda aceitar só o que cabe no avião e no caixa.
- **Memória da Analista:** por navegador (`localStorage`); um save importado não traz o que ela já explicou.
- **Preset Tutorial:** 30 dias, US$ 3 mi, Estados Unidos, sem Estação inicial, um turboélice, um guarda-costas e um advogado.
