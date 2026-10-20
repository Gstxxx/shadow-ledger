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

### Diretor por Origem (`directors.tsx`)

- `<DirectorPortrait origin="field-agent|banker|colonel|diplomat|smuggler|sigint" mood="neutral|concerned|alert|pleased" size crop="head|bust" background blink />` é a ilustração vetorial de cada Origem de `docs/ORIGENS.md`. Usa o mesmo rig de rosto da Analista, mas cada Origem tem cabelo, roupa, acessórios (cicatriz, caneta-tinteiro, quepe sem insígnia, óculos e lenço, cigarro apagado, fones e tela refletida), luz rasante e fundo próprios.
- Até 72px o enquadramento fecha na cabeça e fica quadrado, para o ícone de 48px no topo da tela de jogo. Acima disso mostra o busto em 5:6.
- `<DirectorCard origin selected width={320} />` é o cartão de seleção com moldura de dossiê, número e nome da Origem. O texto de Vantagem e Desvantagem fica com quem usa.
- `ORIGIN_INFO[origin]` traz `label` (pt-BR), `labelEn` e `emblem`, o ID do `<GameIcon>` da Origem (`origin-field-agent` … `origin-sigint`), para marcar Vantagem e Desvantagem. `DIRECTOR_ORIGINS` lista as 6 na ordem do documento.

## Moldura (`frame.tsx`)

- `<DossierFrame label code tone surface="solid|glass|none">` é o painel de HUD com cantos de dossiê e cabeçalho rotulado. `<CornerBrackets />` dá os cantos avulsos.
- `<Stamp text="CONFIDENCIAL|INTERDITADA|DETIDO|SEQUESTRADO|APROVADO|ARQUIVADO|URGENTE|…" sub color rotate size animate wear />` é um carimbo com tinta falhada (máscara de ruído). `animate` dá a batida com overshoot.
- `<Redacted revealed>texto</Redacted>` é uma tarja que acompanha a quebra de linha; o leitor de tela ouve "[censurado]". `<RedactionBar width />` é uma linha censurada avulsa.
- `<Divider variant="rule|ticks|perforation|hazard" label tone />`, `<ClassificationBar level="restrito|secreto|ultrassecreto" caveat />` e `<Tape />`.

## Desempenho e celular (ADR 0003)

- Animações só com `transform`/`opacity`. Nada roda em JS por quadro.
- Os filtros SVG mais caros (papel, carimbo) são estáticos e o navegador os pinta uma vez. Evite muitos `DossierPaper` animados ou redimensionando ao mesmo tempo; em listas longas use `lite`.
- Ícones legíveis a 20px. Alvos de toque são responsabilidade de quem usa: envolva o ícone num botão de pelo menos 44px.

## PWA

- Os ícones ficam em `public/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (monograma a 50%, dentro da zona segura), `apple-touch-icon.png` (180), `favicon-32.png` e `favicon.svg`. Os SVG de origem são `icon.svg` e `icon-maskable.svg`, gerados por `appIconSvg()`.
- Para regenerar depois de mudar o logo, exporte `appIconSvg(512)` e `appIconSvg(512, { maskable: true })` para os SVG (com `npx -y tsx`) e rasterize com `npx -y @resvg/resvg-js-cli --fit-width <px> <svg> <png>`. Nada disso entra no `package.json`.
- As screenshots do manifest ficam em `public/screenshots/*.webp` (1280×720, `form_factor: wide`) e foram capturadas do jogo publicado.
- Service worker (`public/sw.js`):
  - A página vai à rede primeiro; o cache é a reserva offline.
  - `/assets/*` com hash vem do cache primeiro.
  - O resto do site é servido do cache e revalidado em segundo plano.
  - A cada `index.html` novo, os assets de builds antigos são apagados.
  - Só registra fora do servidor de dev (script inline no `<head>` do `index.html`).
  - Mude `SHELL_VERSION` só quando mudar a lógica do SW.

## Componentes de jogo (`game-ui.css`, `game-ui.tsx`)

O pedido foi que a interface parecesse um jogo, e não uma página HTML. O sistema `.g-*` dá volume, corte chanfrado e resposta física aos controles. As classes funcionam direto em JSX, e os componentes React são atalhos que já tocam o som de UI pela API existente (`audio.sfx('click' | 'hover')`).

### Auditoria (jogo publicado em 1440×900 e 440×956)

| O que parece "página web" | Onde | Correção |
|---|---|---|
| Botões planos de formulário (retângulo âmbar liso, contorno de 1px) sem volume nem estado de pressionado | Comprar, Ver México, Destacar Equipe, `.btn` em geral | `.g-btn` com bisel, aro duplo, sombra que comprime e desce 2px ao pressionar, brilho âmbar no hover |
| Desabilitado só com opacidade 38%, que parece "carregando" | Comprar sem caixa/espaço | Face apagada com tarja diagonal; continua legível |
| Toggles de camada e velocidade como caixas soltas de borda fina | Postura/Exposição/Política, 1×/2×/4×/8× | `.g-seg`: trilho rebaixado com a opção ativa em relevo âmbar |
| Abas sublinhadas (navegação de site) e pílulas que transbordam | Frota/Carga/…; Oportunidades/Armamento | `.g-tabs`/`.g-tab` como fichário: trapézio, a ativa encosta no corpo, filete âmbar no topo |
| Seções separadas só por um fio; superfícies todas iguais | Painéis de país e agência | `.g-panel` com chanfro, rebites, marca de registro âmbar, textura de chapa e cabeçalho com marca |
| Traços como `<span>` com contorno verde | Persuasivo, Modesto | `.g-chip`: etiqueta com furo, em tons de sistema |
| Barras finas e cinza, sem escala | Reputação, Exposição, Espaço, Tensão | `.g-meter` com trilho rebaixado, marcas de 10%, borda de avanço e limiar |
| Números sem algarismos tabulares em alguns lugares; títulos em sans de documento | barra superior, nome do país | `.g-counter` (tabular, unidade menor, pisca verde/vermelho ao mudar); `.g-title` (Archivo largura 75%, caixa alta) |
| "?" de 16px abaixo da área de toque mínima | Reputação?, Exposição?, Carga? | `.g-help`: 20px visíveis e 44px de toque |
| Menu principal como lista de links | Menu | `.g-menu-item`: marcador ▶ que desliza, faixa âmbar, som |

Antes, no jogo publicado:

![antes 1440](art/antes-jogo-1440.webp)

Depois, com a mesma tela recriada com `.g-*` (`?solo=game` na galeria):

![depois 1440](art/depois-jogo-1440.webp)

Ponte `.g-skin` aplicada ao jogo real, sem mudar o JSX: só os `.btn` mudam.

![ponte](art/ponte-g-skin-1440.webp)

Kit em 1280 e em 440:

![kit](art/kit-jogo.webp)
![kit 440](art/kit-jogo-440.webp)

### Paleta de jogo (hierarquia)

| Papel | Token | Uso |
|---|---|---|
| Fundo | `--g-bg` #090b0e | atrás de tudo |
| Superfície | `--g-surface` #11151a | painéis |
| Elevada | `--g-raised` #181d23 | topo dos painéis, corpo das abas |
| Controle | `--g-control` #222930 | face dos botões secundários |
| Rebaixado | `--g-sunken` #06080a | trilhos de barra e de segmentado |
| Texto | `--g-text` 15:1 · `--g-text-2` 8,2:1 · `--g-text-3` 4,6:1 (só rótulo) | |
| Ação | `--g-action` #f2a93b (texto `--g-on-action`, 10:1) | o que o jogador pode fazer |
| Perigo | `--g-danger` #e5484d | Abortar, Ameaça, Exposição alta |
| Ao vivo | `--g-live` #4fd8e0 | **só** preços ao vivo, radar, espaço em tempo real |
| Ganho | `--g-ok` #46b98d | lucro, traço positivo |

Motion: pressionar em 80ms e transições de cor/brilho em 140ms; com reduced-motion fica sem animação.

### Classes e componentes

| Classe | Componente | Variantes |
|---|---|---|
| `.g-btn` | `<GButton variant size icon iconEnd sub block busy sfx>` | `--primary` `--secondary` (padrão) `--danger` `--ghost`, `--sm` `--lg` `--block` `--icon`; estados `:disabled`, `.is-pressed`, `.is-busy` |
| `.g-btn--icon` | `<GIconButton label icon>` | `label` vira `aria-label` |
| `.g-seg` + `.g-seg__opt[aria-checked]` | `<GSegmented options value onChange label>` | navegação por setas |
| `.g-panel` + `.g-panel__head/__title/__rule/__code` | `<GPanel label code tone raised pad>` | `--raised` `--sunken` `--alert` `--action` `--paper` |
| `.g-tabs` + `.g-tab[aria-selected]` + `.g-tabbody` | `<GTabs items value onChange label compact>` | `--alert`; setas, Home e End |
| `.g-chip` | `<GChip tone icon>` | `--ok` `--warn` `--danger` `--live` (ponto pulsando) |
| `.g-badge` | `<GBadge tone>` | `--alert` `--action` |
| `.g-meter` + `.g-meter__fill` (`--v` 0..1) + `.g-meter__mark` (`--m`) | `<GMeter value max tone segmented thin mark label valueText>` | `--danger` `--live` `--ok` `--neutral`, `--segmented` `--thin` |
| `.g-counter` | `<GCounter value format unit suffix signed flash size>` | `--lg`, `.is-up`/`.is-down` |
| `.g-row` | — | linha de lista com faixa âmbar no hover e na seleção; `--off` |
| `.g-menu-item` | `<GMenuItem label meta current>` | |
| `.g-help` | `<GHelp label>` | |
| `.g-title`, `.g-label` | — | título de seção, rótulo mono |

**Ponte `.g-skin`.** Com `import './art/game-ui.css'` e a classe `g-skin` num ancestral (por exemplo o `#root` ou `.game`), os botões antigos (`.btn`, `.btn.primary`, `.btn.danger`, `.btn.ghost`, `.btn.sm`, `.btn.icon`) ganham o visual de `.g-btn` sem trocar o JSX. É o caminho mais curto para a tela de jogo; o resto (abas, chips, barras) se adota trocando a classe.

### Adoção: atual → novo

| Atual | Novo |
|---|---|
| `button.btn` / `.btn.primary` / `.btn.danger` / `.btn.ghost` / `.btn.sm` / `.btn.icon` | `g-skin` no ancestral (ponte) ou `.g-btn` + `--primary/--danger/--ghost/--sm/--icon` |
| `.map-modes button` (Postura/Exposição/Política) | `<GSegmented>` ou `.g-seg` > `.g-seg__opt[aria-checked]` |
| `.tb-speed` (pausa, 1×–8×) | `.g-seg`; pausa com `.g-seg__opt` usando ícone |
| `.map-zoom` (+ / −) | `.g-btn.g-btn--icon.g-btn--sm` |
| `.tabs` / `.tab` / `.badge` (painel da agência) | `.g-tabs` / `.g-tab` / `.g-badge` (`--alert` quando `.hot`) e corpo `.g-tabbody` |
| abas de categoria do Mercado (`.mk-head` pílulas) | `<GTabs>` com `icon` e `count` |
| `.sec` / `.sec-head` (seções do painel) | `.g-panel` + `.g-panel__head` |
| `.chip`, `.trait`, `.status` | `.g-chip` (`--ok` traço bom, `--warn` Ferido/Danificado, `--danger` Detido, `--live` "preços ao vivo") |
| `.meter` / `.meter-fill`, `.cap-bar`, `.tension` / `.tension-fill` / `.tension-mark` | `.g-meter` (`--v`) + `.g-meter__mark` (`--m`); Tensão `--danger --segmented` |
| `.tb-v`, `.num` (valores da barra) | `.g-counter` (`--lg` na barra superior) |
| `.cty-title` (nome do país) | `.g-title` |
| `.mk-row`, `.unit-row`, `.station-row` | `.g-row` (`aria-selected` ou `.is-selected`) |
| `?` de glossário | `.g-help` |
| menu: `.slm-nav-item` | `<GMenuItem>` / `.g-menu-item` (`.g-menu-item__meta` no lugar de `.slm-nav-meta`) |
| menu: `.slm-btn--primary` / `.slm-btn--ghost` (no papel) | `.g-btn--primary` / `.g-btn--ghost` dentro de `.g-panel--paper`, ou só a ponte |
| menu: `.slm-seg` / `.slm-seg-btn` | `.g-seg` / `.g-seg__opt` |
| menu: `.slm-icon-btn` | `.g-btn--icon` |

## Componentes de jogo, fase 2 (`game-ui-2.css`, `game-ui-2.tsx`)

`game-ui.css` já carrega `game-ui-2.css` (via `@import`), então um único import cobre as duas fases. A ponte `.g-skin` também ganhou uma fase 2 que melhora as classes atuais **sem mexer em layout**: muda fundo, borda, sombra, tipografia e pseudo-elementos, mas não display, tamanho nem posição.

![kit fase 2](art/fase2-kit-a.webp)
![telex, mapa e tabuleiro](art/fase2-kit-b.webp)

Ponte da fase 2 no jogo real (build de `main` com `g-skin`):

![1440](art/fase2-jogo-1440.webp)
![ficha 1440](art/fase2-ficha-1440.webp)
![440 com safe](art/fase2-jogo-440-safe.webp)
![956×440](art/fase2-jogo-956x440.webp)

| Peça | Classe | Componente |
|---|---|---|
| Barra superior como HUD | `.g-hud` | — |
| Mostrador (caixa, lucro, data) | `.g-dial` + `__k` / `__v`, `--ok/--danger/--action/--lg` | `<GDial label tone size>` |
| Folha inferior | `.g-sheet` + `.g-grip` (pega de chapa estriada) | — |
| Gaveta lateral | `.g-drawer` (`--right`) | — |
| Ficha de Mercado/Oportunidade | `.g-card` (`--hot/--danger/--off`) + `.g-well` (poço do ícone) + `__title/__meta` | `<GCard icon title meta seal sealTone actions tone>` |
| Selo carimbado | `.g-seal` (`--ok/--danger/--sm`) | `<GSeal>` |
| Carta de Unidade | `.g-unit` (`.is-selected`, `--out` com `data-status`) + `__portrait` + `__rank > i.on` + `__name/__role/__stats` | `<GUnitCard portrait name role rank stats side selected out onClick>` |
| Medidor bipolar (Reputação) | `.g-meter--bipolar` com `--from` | `<GMeter value={rep+100} max={200} bipolar>` |
| Modal de comando / dossiê | `.g-modal-scrim` + `.g-modal` (`--good/--bad/--intel/--dossier`) + `__bar/__kicker/__title/__body/__foot` | `<GModal open onClose kicker title tone variant actions>` (Esc fecha, som de abrir e fechar) |
| Teletipo | `.g-toast` (`--good/--ok/--bad/--intel`) + `__k` | `<GToast tone kicker>` |
| Dica / glossário | `.g-tip` + `__k` | `<GTip kicker>` |
| Campo | `.g-input` | — |
| Fader | `.g-range` (`--p` = preenchimento) | `<GRange value min max onChange>` |
| Stepper | `.g-stepper` + `__v` | `<GStepper value min max step onChange format>` |
| Interruptor | `.g-toggle[aria-checked]` | `<GToggle checked onChange label>` |
| Marcadores do mapa (SVG) | `.g-mapmark--station/rival/threat`, `.g-maplabel` | `<GMapMarker kind x y inv label tier>` |
| Rota de voo (SVG) | `.g-route` (tracejado andando, brilho) | — |
| Tabuleiro de Combate | `.g-board` (`--cols/--rows`) + `__cell--deploy/target/enemy` (cruzes de registro) | `<GBoard cells>` |
| Carta no tabuleiro | `.g-token` (`--enemy`) + `__card` + `__hp > i.on` | `<GToken portrait hp hpMax enemy col row>` |

Nota: quem aplica `.g-board` numa grade que já tem `aspect-ratio` próprio (ex.: `.grid` do jogo, que carrega depois do kit) passa o aspect-ratio inline, porque as duas classes empatam em especificidade.
| Relatório como telex | `.g-telex` (`--dark`) + `__k/__t` | `<GTelex kicker dark>` |

### Ponte `.g-skin`, fase 2 (automática)

Barra superior (`.topbar`, `.tb-k`, `.tb-name`, `.tb-time`; a partir de 900px `.tb-stat/.tb-clock` viram mostradores), `.cty-title`, `.sec`/`.sec-head h3`, todos os medidores antigos (`.meter`, `.cap-bar`, `.tension`, `.mkt-cap-bar`, `.fs-bar`, `.uc-s-bar`), `.unit-row` (carta; `.sel` com faixa âmbar), retratos em `.unit-row`/`.uc`, `.scrim`, `.event-card`, `.ud` e `.ud-scrim` (com `g-skin`), `.toast` (teletipo), `.help-btn`/`.help-pop`, `.gsheet` e `.gsheet-grip`, `.map-label`, os marcadores `.pin/.threat-pin/.rival` (brilho), a rota de voo tracejada (anda), `.log` (telex escuro), `.grid/.cell/.token` (tabuleiro), `.op` (ficha de missão) e o hover de `.mkt-row`.

### Troca recomendada (fase 2)

| Atual | Novo |
|---|---|
| `.tb-stat` / `.tb-clock` | `<GDial>` (no estreito, `.g-dial` sem rótulo ou só o valor) |
| `.topbar` | `.g-hud` |
| `.gsheet` / `.gsheet-grip` | `.g-sheet` / `.g-grip` |
| gavetas laterais (`.side`, `.side-e`, `.agency`) | `.g-drawer` / `.g-drawer--right` |
| `.mkt-row`, `.opp-item` / `.opp-body` | `<GCard icon seal actions>`; a margem vai no `seal`, e "não cabe" vira `tone="off"` |
| `.op` (Operação Especial) | `<GCard tone="danger" icon="special-op" seal="~25" sealSub="hostil">` |
| `.unit-row` / `.uc` | `<GUnitCard>` (patente nas barras, `out="DETIDO"`/`"FERIDA"`) |
| Reputação (`.meter` + `.meter-mid`) | `<GMeter bipolar value={rep+100} max={200}>` |
| `.event-card` + `.scrim` | `<GModal tone="good/bad/intel">`; "big" = `width={560}` |
| `.ud` (ficha de Unidade) | `<GModal variant="dossier">` ou mantém `.ud` com a ponte |
| `.toast.tone-*` | `<GToast tone kicker>` |
| `.help-pop` | `.g-tip` (`.g-tip__k` = termo do glossário) |
| `.stepper`, `.mkt-stepper`, `.mkt-range` | `<GStepper>`, `<GRange>` |
| interruptores do menu (`.slm-toggle`) | `<GToggle>` |
| marcadores no `WorldMap` (círculos e losangos inline) | `<GMapMarker kind inv>`; rota com `className="g-route"` |
| `.grid` / `.cell` / `.token` | `<GBoard>` / `<GToken>` |
| `.log` / `.log-peek` | `<GTelex kicker dark>` |

## ADR 0006: mapa como palco (modal central com abas)

Demo em `/src/art/gallery.html?solo=stage`. Parâmetros: `&m=agency|item|none` escolhe o modal inicial e `&safe=t,r,b,l` simula as áreas seguras.

![xl 1440](art/adr6-xl-1440.webp)
![voltar](art/adr6-voltar.webp)
![abas laterais 956×440](art/adr6-abas-laterais-956x440.webp)
![440 safe](art/adr6-440-safe.webp)
![dock 440](art/adr6-dock-440.webp)

**`<GModal>`** (compatível com o uso atual, com props novas):
- `size="md|lg|xl"`: `md` = 560px; `lg` = até 1100px; `xl` = até 1320×880, com o mapa aparecendo em volta. Deitado ou com altura ≤ 560px, `lg` e `xl` ocupam toda a área segura; em pé e estreito, a tela toda. Nesses tamanhos o corpo rola por dentro e o cabeçalho e o rodapé ficam fixos.
- `tabs` (`{ id, label, icon, count, alert }[]`), `tab`, `onTab` e `tabsLabel` montam um fichário com contador, ícone e estado ativo. `tabsPlacement="top|side|auto"`: no `auto`, as abas vão para a lateral quando a tela está deitada e baixa (≤ 560px de altura), com navegação pelas setas ↑/↓ (`aria-orientation`). O painel tem `role="tabpanel"`.
- `onBack` e `backLabel` põem um botão de voltar no cabeçalho. `contentKey` (id do conteúdo) toca a transição de troca.
- O scrim respeita `--safe-t/r/b/l`, com `env(safe-area-inset-*)` de reserva.
- Motion: abrir em 180ms; trocar de aba ou de conteúdo em 170ms (fade + 6–8px, horizontal com as abas laterais). Com reduced-motion, nada se move.

**`useModalStack<T>()`** guarda o histórico com um modal por vez. Expõe `current`, `canBack`, `open(m)` (sem histórico), `push(m)` (empilha), `replace(m)`, `back()` e `close()`.

**`<GActionBar items active onSelect label compact>`** é o dock para flutuar sobre o mapa: botões de 72×58px com ícone, rótulo e contador (`alert` em vermelho), e `aria-current` no item aberto. A classe `.g-dock` não define posição, e o exemplo usa `bottom: max(10px, var(--safe-b))`. Abaixo de 380px fica mais estreito; com `compact` mostra só ícones.

`<GTabs orientation="vertical">` também funciona fora do modal (classe `.g-tabs--side`).

## Telas simples (fase 3: `game-ui-3.css`, `game-ui-3.tsx`)

São as peças para as regras de `docs/UX-RULES.md`: veredito no topo, um número grande, uma ação primária, "Detalhes" recolhível e listas curtas. Demo em `/src/art/gallery.html?solo=simple`, com `&s=trade|country|kit` e `&safe=t,r,b,l`.

![kit](art/simples-kit.webp)
![compra 440](art/simples-compra-440.webp)
![compra 956×440](art/simples-compra-956x440.webp)
![país 1440](art/simples-pais-1440.webp)
![kit 360](art/simples-kit-360.webp)

| Peça | Componente | Notas |
|---|---|---|
| Veredito | `<GVerdict tone="good\|neutral\|warn\|danger\|live" icon kicker title detail primary secondary role>` | Faixa e brilho na cor do tom, ícone grande num poço e a frase curta em display. Com container abaixo de 460px, as ações descem e ocupam a largura toda, primária primeiro; se não couberem lado a lado, a secundária vai para a linha de baixo. `role="status"` por padrão; use `"alert"` só para perigo urgente e `"none"` quando o veredito é estático. |
| Número grande | `<GBigNumber label value unit delta deltaText sub tone size>` | Algarismos tabulares com `clamp(30px, 7vw, 44px)`. A variação usa ▲ verde e ▼ vermelha. `size="sm"` serve para números secundários. |
| Detalhes | `<GDetails label summary open onToggle defaultOpen>` | Cabeçalho de 44px com seta, resumo e pega estriada. O corpo é rebaixado e abre em 180ms (grid 0fr → 1fr). Fechado, fica `inert` e `aria-hidden`; o botão tem `aria-expanded/aria-controls`. Toca o som de abrir e fechar. |
| Alavanca de modo | `<GModeSwitch options={[{value,label,icon,tone}]} value onChange label>` | Segmentos de 46px com um cabo que desliza até o modo ativo em 160ms e muda de cor com o `tone` da opção (ex.: Comprar âmbar, Vender verde). É um radiogroup e as setas trocam o modo. |

Compatibilidade com a API local da ui-polish (`stage/Verdict.tsx`): `GVerdict` aceita `tone="bad"` (igual a `danger`), a frase como `children`, `action` (igual a `primary`) e `actionsPlacement="below"` (a ação fica embaixo da frase, à direita do ícone). `GBigNumber` aceita `note` (igual a `sub`). O rótulo de `GDetails` já vem como "Detalhes", e o cabeçalho tem 48px.

O rodapé do `GModal` agora gruda embaixo (`position: sticky`) quando o modal rola, então a ação primária fica sempre à vista, inclusive deitado e com pouca altura.

## Arte dos itens do Mercado (`ItemArt.tsx`)

`<ItemArt id size alt tag illustration />` desenha a arte de qualquer item do catálogo em 4:3:
1. **Foto tratada**, quando o id está em `src/art/itemPhotos.ts`: `public/items/<id>-96.webp` (listas, até 160px) ou `<id>-480.webp` (modal do item). São 20 equipamentos: viaturas, picape armada, blindado 6x6, tanques, antiaéreo, helicópteros, caças, bombardeiro, cargueiros, fuzis, metralhadora e míssil antitanque. Fontes e licenças estão em `docs/CREDITS.md` (todas em domínio público).
2. **Prancha ilustrada** quando não há foto: Pessoal com retrato duotone (DiceBear) e ícone da função; Informação, Programas e Armas de Destruição em Massa com o ícone técnico sobre uma prancheta com grade (ADM com faixas de perigo vermelhas). O Lança-foguetes (`rpg`) e o Blindado de Combate (`ifv`) também ficam na prancha, porque não houve foto adequada sem rosto em close.
3. **Só o `<GameIcon>`** em tamanhos de até 40px.

O componente desenha a moldura por cima de qualquer imagem: cantos chanfrados, linhas de varredura e, a partir de 200px, os cantos âmbar e a etiqueta da categoria (`tag={false}` esconde; `tag="..."` troca o texto). Se o arquivo falhar ao carregar, ele cai na prancha.

![itens 96](art/itens-96.webp)
![itens 240](art/itens-240.webp)

### Trocar pela versão gerada (Higgsfield ou outra)

1. Gere a imagem do equipamento em paisagem, com o objeto centrado, sem texto nem marcas, e de preferência com pelo menos 960px de largura.
2. Passe pelo mesmo tratamento das fotos: recorte 4:3, grade fria (luminância em três paradas, #070e12 → #466068 → #deecec, mantendo 28% da cor original), vinheta e grão. Exporte em WebP de 480×360 (≤ 60 KB) e 96×72. A ferramenta faz tudo isso sem dependências novas: `node src/art/tools/grade-items.mjs <pasta-com-<id>.jpg|png|webp> public/items [id1,id2]`. Ela usa o Chrome instalado (caminho padrão do Windows em `grade-items.mjs`), e o recorte por item (foco `fx`/`fy` e `zoom`) fica em `src/art/tools/item-crops.json`.
3. Grave como `public/items/<id>-480.webp` e `public/items/<id>-96.webp`, **com o mesmo nome**. Se for um item que hoje usa prancha, acrescente o id em `src/art/itemPhotos.ts`.
4. Atualize `docs/CREDITS.md`: troque a linha do item por "imagem gerada para o jogo" com a ferramenta e a data.

## Retratos de Unidade (`UnitPortrait.tsx`)

No jogo, os itens usam a foto (`ItemArt`) quando o id está em `ITEM_PHOTOS` e a ilustração por código (`src/ui/item-illustrations`, Arsenal em `src/ui/game/gear/GearArt.tsx`) no resto.

**`<UnitPortrait itemId seed name size hostile hurt out alt />`** (`src/art/UnitPortrait.tsx`) é o retrato de Unidade no mesmo estilo realista dessas ilustrações:
- **Pessoal:** busto (cabeça e ombros) da figura da função de `people.tsx`, com luz de contorno, fundo de estúdio e vinheta. A `seed` da Unidade sorteia, de forma estável, o cabelo ou a cobertura permitidos para a função (ex.: guarda-costas com cabelo curto, penteado para trás, careca ou coque; comando com visão noturna, balaclava ou capacete), o corpo e o tom da roupa. Com `name` (o `unit.name`), o corpo segue o primeiro nome da lista de `names.ts`, e o cabelo sorteado combina com ele. Duas Unidades da mesma função ficam diferentes, e a mesma Unidade fica sempre igual.
- **Máquinas:** a ilustração do próprio item (`ItemIllustration`, tamanho `sm`), recortada ao quadrado e centrada.
- **Estados:** `hostile` dá moldura vermelha com brilho; `hurt` (Ferida/Danificada) dessatura e põe uma tarja vermelha; `out` esmaece.
- **Uso no jogo:** dentro de `Portrait.tsx`, `<UnitPortrait itemId={unit.itemId} seed={unit.seed} name={unit.name} size={size} hostile={hostile} hurt={!!unit.injury} />` no lugar do DiceBear e do ícone do lucide.

- **Sprite (`look`):** `'auto'`, o padrão, mostra nas máquinas (veículos, helicópteros, aviões, antiaéreos e cargueiros) o quadro parado do sprite de voxel, recortado pela `box` do manifesto. No Pessoal, `'auto'` mantém o busto realista, porque o sprite de corpo inteiro fica pequeno a 36 px. `look="sprite"` força o busto do sprite (cabeça e tronco, escala inteira; a Guarda-costas e a Advogada com nome feminino usam o atlas `women`), e `look="illustration"` força a ilustração.

Revisão: `/src/art/gallery.html?solo=units&size=72|36&n=3[&look=sprite|illustration]`.

## Sprites isométricos de voxel (`public/sprites/`, `sprites.ts`)

Personagens, veículos, aeronaves, efeitos, marcadores do mapa, carga e prédios das Estações em voxel 2:1, virados para SE. Tudo é gerado por código (Python + Pillow) em `tools/sprites/`, que não vai para o pacote. **Licença:** obra própria, gerada por código, sem imagens de terceiros.

- **Regenerar:** `python -I tools/sprites/build.py` na raiz (apaga e refaz `public/sprites/`). Para refazer só alguns conjuntos, passe os nomes dos geradores, ex. `python -I tools/sprites/build.py urban police`. Com `SPRITES_PREVIEW=1`, também grava folhas de conferência com a âncora marcada em `tools/sprites/preview.local/` (fica fora do git).
- **Rig:** `tools/sprites/rig.py`. Com `lean > 0` o tronco inclina para a frente; com `fall < 0` o corpo cai para trás (pivô no calcanhar) e com `fall > 0`, para a frente. As corridas inclinam para a frente e as mortes caem para trás em todos os conjuntos.
- **Tamanho:** de frente, 25 atlas e 4 grupos avulsos somam cerca de 760 KB; com as costas e as variantes são 97 atlas, cerca de 1,8 MB, contando o PNG indexado (256 cores com alfa, sem pontilhado) e os JSON. É cerca de 4× menor que o RGBA e visualmente igual: erro médio de 0,3/255. Os maiores são `vehicles-heli` (82 KB), `aircraft-bomber-aa` (71 KB) e `cargo-planes-b` (64 KB); um personagem fica em cerca de 10 KB. O total exato está em `public/sprites/index.json` (`bytes`).

**Atlas** (`<id>.png` + `<id>.json`, `kind: "atlas"`): cada animação é uma linha e os quadros vão da esquerda para a direita, todos do mesmo tamanho.

```json
{ "kind": "atlas", "id": "urban", "image": "urban.png", "width": 492, "height": 549,
  "frameWidth": 82, "frameHeight": 61, "anchor": { "x": 46, "y": 48 },
  "animations": [ { "name": "idle", "row": 0, "frames": 4, "fps": 4, "loop": true }, … ] }
```

- **`anchor`:** ponto do chão dentro do quadro, em px 1x. Nos personagens são os pés; nos veículos e aeronaves, a origem no solo, onde fica a sombra.
- **Sombra:** a de chão já vem assada no quadro.
- **Animações sem laço** (`loop: false`, ex. `death`, `aim`, `*_destroyed`, `*_shot_down`): param no último quadro.

| Conjunto | Animações |
|---|---|
| `urban`, `military`, `police`, `criminal`, `pilot` | `idle walk run aim shoot/burst reload cover hurt death` e as específicas: `throw kneel cuff shield radio board eject` |
| `legal`, `influence` | `idle walk run present_evidence objection argue phone persuade defeat_victory · bribe whisper convinced back_off defeat` |
| `director` | `director_idle director_walk command shoot hurt death` e as 6 Origens em linhas separadas, com os ids de `origins.ts`: `exagent_idle/_walk banker_idle/_walk colonel_idle/_walk diplomat_idle/_walk smuggler_idle/_walk analyst_idle/_walk` (2 quadros parados + 6 de passada). As linhas antigas `ex_agent banker colonel` (parado+passada juntos) ficam por compatibilidade |
| `women` | `guard_idle guard_walk guard_aim guard_shoot guard_death lawyer_idle present_evidence objection victory` |
| `vehicles-light`, `vehicles-armor`, `vehicles-heli` | `<itemId>_move/_shoot/_destroyed`, helicópteros `_hover _fly _shoot _cannon _rockets _destroyed` (ids do Mercado: technical, patrolcar, apc, tank1, tank3, heli1, heli3) |
| `aircraft-fighters`, `aircraft-bomber-aa`, `cargo-planes-a`, `cargo-planes-b` | `jet1..3_fly/_missile/_shot_down`, `bomber_fly/_bomb/_shot_down`, `sam1_move/_launch/_destroyed`, `sam3_raise/_launch/_destroyed`, `cargo0..3_takeoff/_fly/_land` |
| `vfx`, `vfx-extra` | `explosion blood smoke sparks fire dust flashbang gas tracer · arrest money_gain money_loss flare rain fog level_up alarm interdicted` |
| `markers`, `cargo` | `hostile_group threat rival_agency player_station director contract hunt vault flight · weapons_crate ammo_crate documents special_material technology cash_case gold_bars cargo_pallet container` |
| `station-<nível>` | `normal` (1 quadro), `damaged` e `interdicted` (8 quadros: fogo, fumaça, sirenes) |

**Avulsos** (`<grupo>.json`, `kind: "static"`, itens `{ id, state?, image, width, height, anchor }`):

- `stations`: 5 níveis × `normal | damaged | interdicted`, com ids `cell safehouse office compound base` (`STATION_SPRITE_IDS`). Os três estados de um nível têm o mesmo tamanho e a mesma âncora.
- `interiors`: os 5 interiores.
- `markers-stills` e `cargo-stills`: o 1º quadro de cada marcador ou item, recortado.

**Uso** (`src/art/sprites.ts`, exportado pelo index):

```tsx
<Sprite set="urban" anim="run" playing mirror scale={2} />          // anima no fps do manifesto
<Sprite set="police" anim="death" playing onEnd={() => remove()} /> // sem laço: para no último quadro
<Sprite set="markers" anim="threat" frame={0} anchored />           // pés na origem do pai (position: relative)
<SpriteStill group="stations" id="office" state="damaged" scale={1} />
```

- **Desenho:** `background-position` com `image-rendering: pixelated`. Use escalas inteiras.
- **`mirror`:** espelha para SW; com `anchored`, o espelho é em torno dos pés.
- **Movimento reduzido:** com `prefers-reduced-motion`, mostra o 1º quadro das animações em laço e o último das que não têm laço.
- **Funções:** `loadSpriteAtlas(id)`, `loadSpriteStatic(grupo)`, `preloadSprites(ids)`, `useSpriteAtlas(id)`, `frameRect(atlas, anim, i)`, `frameAt(anim, ms)`, `animDuration(anim)`, `spriteUrl(image)`. Os manifestos ficam em cache por id.
- **Para canvas:** use `frameRect` com `drawImage` e `ctx.imageSmoothingEnabled = false`.

**Costas e variantes** (`tools/sprites/views/`, 2ª fase do `build.py`). Os geradores gravam as poses de frente, giram o modelo 90° no eixo z e renderizam de novo. A luz, a sombra e os destroços saem do modelo já girado.

- **`<set>-back`:** os 9 personagens, `vehicles-light/-armor/-heli`, `aircraft-fighters` e `aircraft-bomber-aa` vistos de costas, virados para NE. Como na frente, rastros de míssil e fumaça saem do quadro por cima.
  - **Inimigos no combate:** `<Sprite set={backSet(set)} mirror …/>` faz o inimigo olhar para NW, de frente para o jogador.
  - **Linhas que não existem de costas:** legal `phone`, pilot `board/eject`, influence `whisper/convinced` e as linhas combinadas do Diretor. Para elas, use a frente; `resolveBackAnim(set, anim)` escolhe o atlas certo.
- **`<set>-v0..v5` e `<set>-v0-back..v5-back`:** 6 elencos por conjunto em `urban military criminal police women`. Cada um tem tom de pele, penteado, cor de cabelo, barba e óculos próprios, com os 6 tons de pele cobertos. `variantSet(set, uid)` escolhe uma variante estável por Unidade.
- **Tamanho e âncora:** os atlas de costas e de variantes têm `frameWidth/frameHeight/anchor` próprios, alguns px maiores que a frente. A ordem das linhas também pode mudar, então procure sempre a animação pelo nome.
- **Peso:** os 144 arquivos somam cerca de 1,05 MB.
- **Fora do pacote:** as características de cada variante e as folhas de conferência ficam em `tools/sprites/preview.local/views/`.

**Pacote misc** (`tools/sprites/misc/`, rodado pelo `build.py` em paralelo com a frente). Os quatro geradores importam os construtores de `tools/sprites` sem modificá-los:

- **Aviões do mapa (`map-planes`, quadro 64×61, âncora no chão):** linhas `<cargo0..3>_<fly|takeoff|land>_<rumo>`, onde o rumo é a direção na tela (`N NE E SE S SW W NW`, N para cima), mais `contrail_puff`. `mapPlaneHeading(dx, dy)` escolhe o rumo a partir do vetor de tela.
- **Ícones de interface (`ui-icons-64` e `ui-icons-32`, `kind: "icons"`):** grade de 6 colunas.
  - Cada item tem `{ id, label, gameIcon, x, y, w, h }`, e `gameIcon` liga o ícone ao `<GameIcon>` equivalente.
  - Uso: `<PixelIcon id="mercado" size={32}/>`, ou `<PixelIcon id="crate" byGameIcon/>` para buscar pelo GameIcon.
  - Ids: `pais mercado agencia combate ameacas relatorio cofre estacao frota escolta equipes contratos arsenal cacadas campanha configuracoes dinheiro`.
- **Veículos XL (`vehicles-xl-<id>` e `vehicles-xl-<id>-back`):** `technical patrolcar apc tank1 tank3 heli1 heli3` em escala 1,6×, com mais contraste.
  - Mesmas linhas da frente, mais `*_wreck` (destroços em laço): depois de `*_destroyed` (uma vez), troque para `*_wreck`.
  - Cada atlas tem quadro e âncora próprios. O índice está em `vehicles-xl.json` (`kind: "index"`).
- **Retratos da história (`portraits-story-128` e `-64`):** bustos de `analyst arrieta moravia_boss moravia_enforcer`, com `<id>_idle` de 4 quadros a 4 fps. O campo opcional `durations` dá os ms de cada quadro.
- **Tempo e peso:** cerca de 50 s no build completo (aviões e veículos XL são os mais lentos) e cerca de 1,1 MB.

**Fundos de combate e cena do menu** (`tools/sprites/scenes/`, precisam de numpy; o `build.py` roda cada arena e o menu em processo próprio).

- **Fundos de combate (`public/sprites/arenas/<id>/`, ids `urbano militar juridico aereo`):** o `aereo` é o do combate aéreo. Cada um traz:
  - `<id>.png`: quadro 0, parado;
  - `<id>-anim.png`: 6 quadros de ambiente a 6 fps, em grade `columns × rows`;
  - `<id>-front.png`: objetos da borda da frente, fora da grade, que vão **por cima** de tudo;
  - `props/<id>.png`: objetos soltos no chão (caixas, barricadas, bancos, carrinhos), recortados do fundo. No manifesto ficam em `props: [{ id, image, x, y, width, height, anchor, col, row, depth }]`.
    - Desenhe-os em ordem de `depth` crescente junto com as Unidades. Uma Unidade na célula (c, r) tem profundidade c + r; em empate, a Unidade vem antes. `arenaDrawOrder(m, unidades)` devolve essa ordem.
    - A sombra deles continua assada no fundo.
    - Como a grade não tem objetos, sobra pouco nessa lista (hoje, 1 no militar e nenhum nas outras); ela só traz o que fica fora da grade e pode cobrir uma Unidade que esteja atrás.
  - `<id>.json`: manifesto (`kind: "arena"`).
- **Escala:** a mesma dos personagens, 10 voxels = 1 m (uma pessoa tem 18).
  - A célula de combate tem 28 voxels (2,8 m).
  - Medidas de referência: portas de 10×22, andares de 24, carro de ~4,7 m, caçamba de 2 m, bancos e mesas na altura do joelho e da cintura.
  - O espaço entre as linhas (colunas 3–4) só tem cobertura até o peito.
- **Grade livre:** nenhuma das 8 colunas tem objetos, por decisão do usuário: a cobertura do meio também saiu. Na grade só há detalhe plano no chão (marcas, poças, manchas, papéis, mato rasteiro). O build falha se algum objeto ficar nela.
- **Grade:** todos são 768×570 a 1x e usam a mesma grade de 8 colunas × 3 linhas (jogador nas colunas 0–2, inimigo nas 5–7).
  - Canto da célula (c, r) = `gridOrigin (234,222) + c·colStep (+56,+28) + r·rowStep (−56,+28)`; o centro fica no canto + (0, 28).
  - Leia sempre os números do manifesto, não estes.
  - `arenaCellCenter(m, c, r)` dá o centro.
  - Com o `<Sprite anchored>` (pés na âncora do próprio atlas), posicione em `centro + (0, 1)`: o atlas usa a âncora (64,71) do rig, e a arena desenha o quadro em centro − (64,70).
- **Cena do menu (`public/sprites/menu/menu-portrait` 216×384 e `menu-landscape` 384×216, `kind: "scene"`):**
  - Opaca, 12 quadros a 8 fps, para ampliar em escala inteira: `recommendedScale` 5 dá 1080×1920 e 1920×1080.
  - Os ~40% da esquerda são escurecidos para o texto do menu.
  - Com movimento reduzido, use só o quadro 0 (`static`).
- **Funções:** `loadArena`, `useArena`, `loadMenuScene`, `useMenuScene`, `sceneUrl(m, arquivo)` e `sceneFrameRect(m, i)`. `public/sprites/index.json` lista os caminhos em `arenas` e `scenes`.
- **Revisão:** `?solo=sprites&set=arena:urbano&scale=2` e `&set=menu:landscape&scale=3`.
- **Peso e tempo:** cerca de 2,4 MB; o build completo leva ~140 s. `SPRITES_PREVIEW=1` grava em `preview.local/scenes/` uma prévia de cada arena com sprites reais (urban e military, de frente e de costas) em todas as células, para conferir a escala.

Cada animação traz também `box: [x, y, w, h]`, a caixa opaca do 1º quadro, útil para recortes justos.

Revisão: `/src/art/gallery.html?solo=sprites[&set=urban][&scale=3][&mirror=1]`.
