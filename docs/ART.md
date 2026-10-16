# Kit visual

Tudo em `src/art/`, feito só com SVG, CSS e Canvas (não há bitmaps nem API de imagem). Os componentes são React + TS puros: não leem estado do jogo, recebem tudo por props e se pintam com os tokens CSS.

Revisão: `npx vite` e abrir `/src/art/gallery.html`. Para ver um asset grande, use `?solo=analyst`, `?solo=analyst&mood=alert`, `?solo=icons&size=120&from=0&n=24`, `?solo=logo` ou `?solo=ops`.

## Direção

Thriller sério de inteligência: dossiê, satélite, terminal, tinta e papel queimado. A base é escura e fria (tinta), com **um acento quente** (âmbar `--sl-warm`, e vermelho-sinal `--sl-signal` para perigo) e **um acento frio** (ciano de radar `--sl-cold`). O papel (`--sl-paper`) aparece só em documentos.

- Âmbar marca o que é do jogador ou pede ação (dinheiro, Contrato, destaque).
- Ciano é informação, sensor, Estação, Analista.
- Vermelho-sinal é Ameaça, Inimigo do Estado, Tensão alta. Não use como decoração.

## Uso

```ts
import './art/tokens.css';            // uma vez, na raiz do app (ou importe de './art', que já carrega)
import { GameIcon, Logo, NoiseBackdrop, DossierFrame } from './art';
```

O `@import` do Google Fonts está no topo de `tokens.css` (Barlow Condensed, IBM Plex Sans, JetBrains Mono, Special Elite).

## Tokens (`tokens.css`, `tokens.ts`)

Três camadas: primitivos `--sl-p-*`, semânticos `--sl-*`, de componente `--sl-c-*`. Componentes só usam semânticos e de componente, então para trocar tema basta redefinir os semânticos num seletor.

| Grupo | Tokens |
|---|---|
| Superfícies | `--sl-bg`, `--sl-bg-deep`, `--sl-surface`, `--sl-surface-raised`, `--sl-line`, `--sl-line-strong` |
| Texto | `--sl-text` (14.9:1), `--sl-text-muted` (6.6:1), `--sl-text-faint` (só decorativo) |
| Acentos | `--sl-warm`, `--sl-signal`, `--sl-cold`, `--sl-ok`, `--sl-on-*` para texto sobre eles |
| Papel | `--sl-paper`, `--sl-paper-ink` (14:1), `--sl-paper-ink-muted` (5.6:1), `--sl-stamp-red`, `--sl-redact` |
| Tipo | `--sl-font-display` / `-body` / `-mono` / `-type`; escala `--sl-fs-2xs` (11) … `--sl-fs-4xl` (64) |
| Espaço / raio | `--sl-space-1…16` (base 4), `--sl-touch: 44px`, `--sl-radius-0…3` (quase reto: dossiê não usa pílula) |
| Sombra / brilho | `--sl-shadow-1…3`, `--sl-shadow-paper`, `--sl-glow-warm/cold/signal` |
| Motion | `--sl-dur-instant…scene`, `--sl-ease-out` (entrada), `--sl-ease-in` (saída, mais rápida), `--sl-ease-stamp` |
| Camadas | `--sl-z-backdrop/map/hud/drawer/modal/toast` |

Com `prefers-reduced-motion`, as durações viram 0. Em TS: `palette`, `color`, `font`, `motion` (com `motion.gsap` para o GSAP), `prefersReducedMotion()`, `prefersLiteRendering()`, `hexToRgb01()`.

Texto: corpo nunca abaixo de 12px; 11px só em rótulo mono maiúsculo.

## Logo (`Logo.tsx`)

- `<Logo variant="full|horizontal|compact|mark" height={64} tagline="…" />`
- `<Monogram size={48} />`: o "S" de estêncil feito de três linhas de livro-razão; a do meio é âmbar e o ponto ciano é um contato de radar. É só caminhos, sem depender de fonte.
- `appIconSvg(512 | 192, { maskable })` devolve a string SVG para o manifest PWA, e `appIconDataUrl()` devolve a `data:` URL. A versão maskable mantém o monograma na zona segura.

## Ícones (`icons/`)

`<GameIcon id="tank3" size={20} accent="warm|cold|signal|ok|none|<cor>" title="…" />`

- Grade 24×24, traço `currentColor` e um único acento por ícone. O traço afina sozinho acima de 24px, e a partir de 40px aparece uma camada de detalhe (rebites, painéis).
- Sem `title` o ícone é decorativo (`aria-hidden`). Num botão só de ícone, passe `title` ou um `aria-label` no botão.
- `iconSvgString(id, { size, color, accent })` dá o SVG autônomo, para canvas, d3 ou `<img>`.
- IDs:
  - Todos os itens de `src/game/data/items.ts`, com os mesmos IDs: `bodyguard` … `nuclear`.
  - Pessoal: `director`.
  - Frota e carga: `fleet`, `crate`.
  - Estações: `station-cell|safehouse|office|compound|base`; o array `STATION_TIER_ICON[nível]` indexa por nível.
  - Postura: `reputation`, `stance-ally|neutral|enemy`.
  - Sistemas: `exposure`, `threat`, `tension`, `final-crisis`, `contract`, `vault`, `team`, `money`, `event`, `rival`, `clock`, `forecast`, `special-op`, `coup`, `neutralization`.
  - Táticas: `tactic-assault|hold|infiltrate|negotiate`.
  - Combate: `combat-legal|urban|army|air`.
  - Estados: `seized`, `detained`, `abducted`, `wounded`, `damaged`.
- `CLASS_ICON[cls]` dá o ícone representativo de cada `UnitClass`. As patentes 1–3 aparecem como barras no canto superior esquerdo (advogados, Agentes de Influência, cargueiros).

## Fundos (`backdrops.tsx`)

Todos são camadas `position:absolute; inset:0` (exceto o radar) e `pointer-events:none`. O pai precisa de `position: relative`.

- `<NoiseBackdrop grain vignette scanlines roll tint="none|warm|cold" fill />` gera um ladrilho de grão uma vez num canvas e o anima só com `transform`, o que custa ~0 por quadro. O grão fica estático com reduced-motion ou em aparelho fraco (Save-Data, ≤2 GB de memória ou ≤2 núcleos).
- `<RadarSweep size period tone blips={[{x,y,tone}]} />` desenha o feixe com `conic-gradient`, e os contatos acendem quando o feixe passa.
- `<DossierPaper burn stain fold seed tilt lite>` aplica fibra, manchas e borda queimada com filtros SVG (`feTurbulence` + `feDisplacementMap`). `lite` (automático em aparelho fraco) usa só gradiente. O padding cresce com `burn`, para o texto não cair no queimado.
- `<WorldGlow tension={0..1} spots={[{x,y,tone,r}]} grid />` vai atrás do mapa. A luz central vai de ciano a âmbar a vermelho conforme a Tensão Global, e os focos pulsam onde há crise.

## Retratos (`portraits.tsx`)

- `<AnalystPortrait mood="neutral|concerned|alert|pleased" speaking blink size />` é a Analista, personagem fixa: ilustração noir com luz de monitor ciano de um lado e luz quente do outro. O LED do fone muda com o humor (âmbar, vermelho no alerta, ciano quando satisfeita). `speaking` anima a boca e `blink` pisca; os dois param com reduced-motion.
- `<OperativePortrait seed tone="cold|warm|paper|signal" code name status frame />` usa o DiceBear `notionists`, com duotone, meio-tom, régua de altura, ficha de papel, clipe e tarja de código. `status` sobrepõe um carimbo (`DETIDO`, `FERIDA`…) e `frame={false}` deixa só a foto quadrada, para listas. O avatar fica em cache por seed.

## Moldura (`frame.tsx`)

- `<DossierFrame label code tone surface="solid|glass|none">` é o painel de HUD com cantos de dossiê e cabeçalho rotulado. `<CornerBrackets />` dá os cantos avulsos.
- `<Stamp text="CONFIDENCIAL|INTERDITADA|DETIDO|SEQUESTRADO|APROVADO|ARQUIVADO|URGENTE|…" sub color rotate size animate wear />` é um carimbo com tinta falhada (máscara de ruído). `animate` dá a batida com overshoot.
- `<Redacted revealed>texto</Redacted>` é uma tarja que acompanha a quebra de linha; o leitor de tela ouve "[censurado]". `<RedactionBar width />` é uma linha censurada avulsa.
- `<Divider variant="rule|ticks|perforation|hazard" label tone />`, `<ClassificationBar level="restrito|secreto|ultrassecreto" caveat />` e `<Tape />`.

## Desempenho e celular (ADR 0003)

- Animações só com `transform`/`opacity`. Nada roda em JS por quadro.
- Os filtros SVG mais caros (papel, carimbo) são estáticos e o navegador os pinta uma vez. Evite muitos `DossierPaper` animados ou redimensionando ao mesmo tempo; em listas longas use `lite`.
- Ícones legíveis a 20px. Alvos de toque são responsabilidade de quem usa: envolva o ícone num botão de pelo menos 44px.
