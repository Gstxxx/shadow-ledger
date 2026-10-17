# combat-fx — camada de animação de Combate

Anima o que o motor já emite a cada turno (`CombatState.fx`: `move`, `hit`, `down`, `convert`, `breach`), além da entrada do Combate, do resultado e do contador de turno. Usa GSAP e mexe só em `transform` e `opacity`: nada de layout por quadro.

## A ideia

O Combate é anotado no dossiê da operação, na mesma linguagem da abertura (livro-caixa, tarja de censura, carimbo):

| Evento | O que se vê | Curvas e tempo (quadros a 30 fps) |
|---|---|---|
| Entrada | As fichas são jogadas na mesa, cada lado vindo da própria borda, as de trás primeiro (2 quadros entre colunas). | `softLand` 12 |
| `move` (avanço da frente) | FLIP da casa antiga para a nova: recua um fio (antecipação) e desliza. | `gentleIn` 3 + `softLand` 9 |
| `hit` (golpe) | Tremor de 4 passos no sentido do golpe e flash de flashbulb recortado no retrato, na cor do tipo de Combate. Ao lado do retrato, um contador de dano soma a cada golpe (−1 → −2…). | flash `glide` 6, tremor `steps(4)` 4, contador `snapSettle` 6 |
| `down` (abate) | Tarja de censura sobre os olhos do retrato. Depois de 2 quadros com a tarja lida, a ficha se desfaz em 6 linhas de dossiê que saem alternando o lado. | tarja `glide` 6, linhas `accelExit` 9 (1 quadro entre elas) |
| `convert` (conversão) | O retrato ganha a cor do novo lado (âmbar quando vem para a agência, vermelho quando nos trai) e recebe o selo de recrutamento; depois sai da grade. | selo `snapSettle` 9 (de 2,2×), saída `accelExit` 9 |
| `breach` (ruptura da linha) | Holofote varre a casa, a faixa da linha acende e a câmera (a grade) dá um puxão na direção da ruptura e volta. | varredura `whip` 5, câmera `whip` 7 + `softLand` 14 |
| Resultado | Carimbo de borracha com tinta falhada (verde no sucesso, vermelho no fracasso): cai de 2,6× e a folha treme no impacto. É a única "mola" do Combate. | `snapSettle` 10, tremor `steps(4)` 6 |
| Turno | `RollingNumber`: o número antigo sobe e sai acelerando; o novo chega de baixo e assenta. | `accelExit` 6 / `softLand` 8 |

**Cores por tipo de Combate:**
- Jurídico: papel (é tinta).
- Urbano: âmbar.
- Militar: vermelho-sinal.
- Aéreo: ciano de radar.

**Ritmo:**
- Os avanços acontecem juntos (1 quadro entre linhas).
- Os duelos se encadeiam por linha, cada linha com seu cursor, a partir do 8º quadro (3 quadros entre linhas).
- Um turno é encaixado em **0,9 s a 1×**, medido pelo fim dos eventos; as caudas de saída podem passar um pouco.
- A velocidade (`speed` 2/4) multiplica isso.
- Um turno novo termina na hora o anterior.

**Reduzir movimento:** sem tremor, deslize, tiras, câmera nem carimbo caindo. Só flashes suaves, troca por opacidade e o carimbo aparecendo.

## API

```tsx
import { RedactedTitle, RollingNumber, useCombatFx } from '../combat-fx';

const grid = useRef<HTMLDivElement>(null);
const fx = useCombatFx({ grid, combat: c, speed: fast ? 2 : 1 });
// fx.skip(): termina a animação em curso ("Pular")    fx.busy(): há animação tocando

<strong><RedactedTitle>{c.title}</RedactedTitle></strong>
<RollingNumber value={c.turn} />/{c.maxTurns}   // dentro do texto de turno já traduzido
<div ref={grid} className="grid">… tokens …</div>
```

`useCombatFx(options)`:
- `grid` (obrigatório): ref do elemento posicionado (`position: relative`) onde ficam os tokens. O hook cria a própria camada dentro dele; não há JSX para montar.
- `combat` (obrigatório): o `CombatState` atual. O hook reage a `turn`, às posições das Unidades e a `result`.
- `speed`: 1, 2 ou 4.
- `reduced`: força reduzir movimento; sem valor, segue `prefers-reduced-motion`.
- `intro`: anima a entrada das fichas ao montar (padrão `true`).
- `axis`: `'x'` (deitada, o jogador avança →) ou `'y'` (em pé, o jogador avança ↑). Sem valor, a camada deduz o eixo das posições reais dos tokens.
- `verdictText(success, c)`: texto do carimbo. Sem ele, usa `combatfx.stamp.win|lose` do i18n; enquanto essas chaves não existirem, cai em `game.combat.result.*` em caixa alta.

### Grade deitada ou em pé (ADR 0005)

Os efeitos seguem o **eixo da própria grade**, não um eixo fixo. A camada deduz o vetor "para a frente" (do lado do jogador para o inimigo) das posições reais de duas Unidades em colunas diferentes. Assim, em paisagem é →, e com a grade girada em retrato (jogador embaixo, inimigo em cima) é ↑. Seguem esse eixo:
- a antecipação do avanço;
- o tremor do golpe;
- o puxão de câmera e a faixa da ruptura;
- o lado de onde cada força entra.

Para girar, **reposicione os tokens por `left/top`** (por exemplo `left = row/rows`, `top = (cols-1-col)/cols`) e troque o template da grade. **Não** gire com `transform: rotate`: retratos, números e carimbo virariam de lado. A prévia tem `?portrait=1`.

### Contrato com a tela de Combate

1. Cada token de Unidade tem `data-fx-key={ref.key}` e `data-fx-side={ref.side}`; `data-fx-col={ref.col}` e `data-fx-row={ref.row}` são opcionais (quando existem, a camada usa a coluna do token em vez de procurá-la no estado). A posição continua sendo `left/top` em %, como hoje.
2. A tela **não** anima mais `hit`, fantasmas nem a `transition` de `left/top`. A camada desliga essa transição nos tokens e assume o movimento, ou o FLIP brigaria com o CSS.
3. Quem saiu da grade no turno (abatido ou convertido) não precisa ser renderizado como fantasma. A camada guarda uma cópia visual de cada token a cada turno e a anima depois que o React o removeu.
4. "Pular para o fim" (vários turnos de uma vez) não anima turnos intermediários: só o carimbo.
5. Os sons continuam na tela (`audio.sfx('hit'|'kill'|'win'|'lose')`). A camada não toca som.

## Tela de resultado (`<CombatResult>`)

Vitória: hit-stop de 120 ms com clarão âmbar, o tabuleiro recua e escurece, o carimbo VITÓRIA bate de 1,6→1 (tremida, poeira de papel e lascas de tinta), linhas de dossiê varrem a tela, cards de resumo entram em cascata com contador. Derrota: dessatura e treme, tarjas pretas fecham sobre o tabuleiro uma a uma, carimbo FRACASSO vermelho com tinta borrada, vinheta pulsando, resumo das perdas. Em ambas o botão Concluir só aparece depois do clímax (~1,2 s); tocar antes pula para o fim; reduzir movimento troca tudo por cortes.

```tsx
const grid = useRef<HTMLDivElement>(null);
useCombatFx({ grid, combat: c, verdict: false }); // sem o carimbo pequeno
{c.result && (
  <CombatResult
    kind={combatSucceeded(c) ? 'win' : 'lose'}
    title={win ? t('game.combat.result.win').toUpperCase() : t('combatfx.stamp.lose')}
    items={[{ label: '…', value: 2, tone: 'good' }, { label: '…', value: 2400000, format: usd, tone: 'good' }]}
    doneLabel={t('game.combat.finish')}
    onDone={finish}
    board={grid.current}
  />
)}
```

`items` são montados pela tela (rótulos dela no i18n): vitória = baixas, convertidos, XP, recompensa US$; derrota = unidades feridas/detidas e o Diretor (detido/abduzido) se for o caso. Sem React: `buildResult(host, opts)` devolve `{ tl, skip(), destroy() }`. Protótipo: `showcase.html?ending=win|lose`.

## Prévia

`/src/ui/combat-fx/preview.html` no `npm run dev` (fora do build). Roda um Combate de verdade (`createCombat` + `stepCombat`) com os mesmos tokens e retratos da tela.

Parâmetros:
- `?type=urban|army|legal|air`
- `?seed=N`
- `?scene=convert|breach`: cenas para ver conversão e ruptura.
- `?rm=1`: reduzir movimento.
- `?auto=0`: só turno a turno.
- `?nointro=1` / `?nofx=1`: diagnóstico.

Em desenvolvimento, `window.__cfxTl.pause().seek(t)` mostra qualquer quadro do turno atual.

## Revisão (motionmaxxing)

Quadros capturados em Chrome headless (rAF real), com a timeline pausada:
- Combate comum (seed 7), cena de conversão e cena de ruptura, a 1280×720.
- Combate comum em 640×360.
- Reduzir movimento.

Correções feitas a partir deles:
- O flash radial grande virou um flash recortado no retrato.
- Os "−1" empilhados viraram um contador por Unidade, e o contador saiu de cima do retrato porque invadia a linha de cima em 640×360.
- A tarja larga virou a barra sobre os olhos.
- A tinta da conversão, que cobria a casa toda, ficou presa ao retrato.
- A inundação âmbar da grade inteira na ruptura virou a faixa da linha.
- O carimbo, que antes cortava a animação do turno decisivo, agora vem depois dela.

Gate G5 (`lint.mjs`) na prévia: **FAIL em C3 e V2.**
- C3 é o contador de turno "0/10": a tela de Combate precisa dele.
- V2 era o título falso da prévia ("Sahel · 818"), já trocado pelo nome do país.
- O `lint.mjs` leu a página como quadro estático, porque não há `__seek`.

`look.py` (G0/G2/G3) não se aplica: não há vídeo renderizado.

Desempenho:
- Por quadro, só `transform` e `opacity`.
- O `clip-path` das tiras é fixo.
- As leituras de layout (`offsetLeft`, `getBoundingClientRect`) acontecem uma vez por turno, ao montar a timeline.

Ainda não medi 60 fps num celular real.
