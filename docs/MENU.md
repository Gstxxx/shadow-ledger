# Menu inicial

Código em `src/ui/menu/`. Telas: Abertura → Título → dossiês de Nova partida, Continuar, Configurações e Créditos.

## Como montar

O jeito curto, já ligado aos stores do jogo (`src/store/game.ts`, `src/store/settings.ts`):

```tsx
import { ConnectedMainMenu } from './ui/menu';

{screen !== 'game' && <ConnectedMainMenu skipIntro={!firstTitle} />}
```

O jeito sem store: `<MainMenu {...props} />`. Todas as props são opcionais, então o menu roda sozinho.

| Prop | Tipo | Para quê |
|---|---|---|
| `presets` | `PresetDef[]` | Padrão: `PRESETS` de `src/game/data/rules`. |
| `tutorialPresetId` | `string` | Preset do Tutorial. Sem ele, o botão do Tutorial usa o primeiro Preset. |
| `onStart` | `(cfg: StartConfig) => void` | `{ kind: 'preset' \| 'sandbox' \| 'tutorial', preset, difficulty, hardcore, rivals }`. No Sandbox, `preset` é um `PresetDef` montado pelo menu (`id: 'sandbox'`). |
| `saves` | `SaveSlot[]` | Lista de Continuar (`id, label, presetTitle, savedAt, gameDay, profit?, hardcore?`). |
| `onContinue` / `onDeleteSave` / `onExportSave` | `(id) => void` | Ações por save. Um botão só aparece quando a callback dele existe. |
| `onImportSave` | `(file: File) => Promise<void>` | Rejeite com `Error(mensagem)` se o arquivo for inválido; a mensagem aparece na tela. |
| `settings` / `onSettingsChange` | `MenuSettings` | `lang, musicVolume, sfxVolume, defaultSpeed (1\|2\|4), analystMuted, reducedMotion`. Sem `settings`, o menu guarda tudo em `localStorage['sl.settings']`. |
| `skipIntro` | `boolean` | Pula a abertura, por exemplo ao voltar de uma partida. |

Áudio: o menu chama `audio.setScene('menu')` ao montar e `audio.unlock()` no primeiro toque ou tecla. Os efeitos usados são `click`, `type`, `redact`, `open`, `close`, `alert` e `arrive`.

### O que ainda falta do lado do jogo
- `GameOptions` não tem `rivals`. O `ConnectedMainMenu` já manda o campo; ele passa a valer quando o motor ler.
- O store de configurações não tem `lang` nem `analystMuted`. O `ConnectedMainMenu` guarda os dois em `localStorage['sl.menu.extra']`. Quando existir `src/i18n`, os textos de `strings.ts` migram para lá.
- Continuar mostra um único slot (o autosave de `store/game`). Para apagar um save, o store precisa expor `deleteSave()`.
- Não existe Preset de Tutorial próprio.

## Nova partida: passo Diretor

Ordem dos passos: **Cenário → Diretor → Configurar**.

- **Fichas:** 6 Origens (`ORIGINS` de `src/game/data/origins.ts`). Cada ficha tem o retrato da art-kit (`DirectorPortrait`), o nome e o emblema. A escolhida ganha borda azul, brilho e check.
- **Dossiê aberto:** ao lado (em pé, em cima) fica o dossiê da Origem escolhida: retrato em busto, bio, Vantagem em verde e Desvantagem em vermelho, com ícones.
- **Animação:** ao trocar de Origem, a capa de pasta manila gira sobre a dobra (`gentleIn`, 10 quadros) e a página de dentro pousa: o retrato com `softLand` e as linhas com 2 quadros entre si. Com reduzir movimento, a troca é por corte.
- **Teclado:** setas, Home e End movem a seleção; escolher de novo a Origem já escolhida avança para Configurar.
- **Partida:** a Origem vai em `StartConfig.origin`, que vira `GameOptions.origin`, e aparece no resumo. No Tutorial, o padrão é a do motor (`TUTORIAL_ORIGIN`, Contrabandista) até a pessoa escolher outra.
- **Ids:** o motor usa `exagent`/`analyst` e a arte usa `field-agent`/`sigint`. `artOrigin(id)`, exportado de `src/ui/menu`, faz a tradução para quem precisar do retrato.
- **Textos:** as chaves `origin.<id>.name/.desc/.advantage/.disadvantage` e `menu.new.origin.*`, `menu.new.step.director`, `menu.new.nextDirector`, `menu.new.backToDirector`.

## Celular em pé (ADR 0005)

Referências de retrato: 360×640 e 390×844.
- **Título:** sobe para o alto da tela, com o mapa de rotas na parte de baixo.
- **Escala:** o nome e as linhas do livro-caixa escalam também pela largura (`min(vh, vw)`).
- **Abertura:** no soco, o nome é limitado a 86% da largura.
- **Dossiês:** já ocupam a tela inteira.
- **Nova partida:** fica em coluna; no rodapé, o "Passo N de 2" some abaixo de 420 px de largura, porque o indicador de passos no topo já mostra isso.
- **Paisagem:** continua igual.

## Componentes de jogo (.g-*)

O menu importa `src/art/game-ui.css` e usa o kit da art-kit em vez de controles de página:
- **Itens do Título:** são `.g-menu-item`, com marcador ▶, faixa âmbar e som de hover. Continuam com a tarja de "lançado" ao tocar.
- **Botões dos dossiês:** são `.g-btn` (`--primary`, `--ghost`, `--danger`, `--lg`, `--icon`).
- **Segmentados:** são `.g-seg` / `.g-seg__opt`, com quebra de linha quando há muitas opções e 44 px de toque.

Fase 2 do kit (`src/art/game-ui-2`):
- os interruptores usam o trilho `.g-toggle` (a linha inteira continua sendo o alvo, com rótulo e explicação);
- volumes em `GRange`;
- Agências Rivais do Sandbox em `GStepper`;
- nomes do Diretor e da agência em `.g-input`;
- apagar save confirma num `GModal` de dossiê com tom de perigo;
- mensagens de importação em `GToast`;
- instruções de instalação no iOS em `.g-tip`.

O reset de botões do menu usa `:where(.slm-root) button` (especificidade zero), para as classes `.g-*` vencerem.

## Área segura (notch, Dynamic Island, home indicator)

`.slm-root` usa `100dvh` e define `--slm-st/sr/sb/sl` como `var(--safe-t|r|b|l, env(safe-area-inset-*))`. O MainMenu chama `installSafeAreaDebug()` da ui-polish (`src/ui/game/portrait/safeArea.ts`). Assim, `?safe=top,right,bottom,left` simula os recortes também no menu, e no aparelho vale o `env()`.

O que respeita os insets:
- o padding do Título;
- a dica de pular;
- o dossiê, nos quatro lados (inclusive o notch à esquerda com o celular deitado).

O que fica de fora: a página do livro-caixa e o mapa sangram por baixo do recorte, de propósito, porque são fundo.

Verificado com os recortes simulados em 440×956, 393×852, 375×667 e 956×440.

## Prévia isolada

Com `npm run dev`, abra `/src/ui/menu/preview.html` (fica fora do build). `?skip=1` pula a abertura, `?rm=1` liga reduzir movimento e `?rm=0` desliga. Em desenvolvimento, `window.__slIntro.pause().seek(2.6)` mostra qualquer quadro da abertura.

## Abertura: "o último lançamento" (~4,9 s, pulável)

Por que essa ideia: o nome junta livro-caixa e sombra. A abertura mostra exatamente isso: uma página de livro-caixa sendo preenchida, uma sombra engolindo os lançamentos e a última linha do livro sendo o próprio nome. Sem o logo, a cena não serve a nenhum outro jogo.

| t (s) | Quadro | Para que serve |
|---|---|---|
| 0–0,45 | A luminária acende sobre uma página que já está rolando; câmera a 1,3× e girada −1,8°. | A cena começa em movimento: um livro-caixa sob luz quente. |
| 0,18–1,52 | Sete lançamentos novos entram em corte seco, com intervalos irregulares de 5 a 10 quadros. Cada linha tem data, rota entre países (código ISO numérico), item, quantidade e valor, todos tirados de `COUNTRY_SEEDS` e `ITEM_LIST`. | É contabilidade de verdade: armas, rotas, dinheiro. |
| 0,3–1,9 | Tarjas pretas cobrem os campos (glide, 7 quadros) numa onda irregular; a última linha recebe a tarja mais pesada (softLand, 10 quadros). | A sombra toma o livro. |
| 2,2–2,6 | Respiro: a luz pisca em passos de 2 quadros. | Pausa antes da revelação, com uma coisa viva na tela. |
| 2,6 | Soco de câmera de 1 quadro para 3,4×, assentando em 3,2× (softLand, 14 quadros). No mesmo corte, a tarja da linha vira a tarja do nome, com a mesma largura medida. | Corte em movimento; a linha vira o título. |
| 2,94 | A tarja recua acelerando (accelExit, 10 quadros) e revela SHADOW LEDGER. | A censura se revela. |
| 3,36 | Traço duplo vermelho de fechamento contábil (softLand, 11 quadros, 3 quadros entre os dois traços). | Livro balanceado: o sinal da marca. |
| 3,4–4,1 | Respiro com o nome lido; a câmera se afasta 3% (cruise). | Tempo para ler. |
| 4,1–4,8 | A luz baixa, a câmera recua para 1×, o nome vai para o lugar do Título e a tinta passa de sépia para osso. O mapa entra e os itens do menu chegam como novos lançamentos. | A mesma página vira o fundo do Título. |

Curvas: as 12 curvas medidas da motionmaxxing, em `ease.ts`. Nenhuma mola, nada nasce de escala zero, e entre cenas não há fade (só a luz e o escurecimento da página, que são luz).

Pular: um toque ou uma tecla leva a abertura para 4,1 s e acelera o resto 1,7×. O primeiro toque também liga a música do menu. Se a janela mudar de tamanho durante a abertura, ela vai direto para o fim.

Reduzir movimento: não há abertura. O Título aparece pronto, sem deriva, tarjas vivas nem rotas animadas (o mapa mostra três rotas fixas), e os dossiês abrem e fecham em corte.

## Título

O fundo é a mesma página, agora escura, derivando devagar. De tempos em tempos uma tarja aparece ou sai. Por cima, um mapa-múndi em pontos (Natural Earth 110m, projeção Natural Earth) onde rotas de carga em âmbar são traçadas entre capitais com um ponto viajando. Na chegada, o nó de destino aparece em corte, e a linha é recolhida a partir da origem, acelerando. A luminária balança.

Os itens do menu são linhas do livro: rótulo, pontilhado e, à direita, um número real (quantos Presets, quantos saves). Ao tocar, uma tarja cor de osso passa sobre o item (o item foi "lançado") e o dossiê abre.

## Dossiês

Uma pasta de papel entra pela direita com um giro de 2,2° que assenta (softLand, 13 quadros) e sai acelerando (accelExit, 9 quadros). O Título recua 24 px e escurece. Escape ou Voltar fecham, e o foco volta ao item que abriu o dossiê. Enquanto o dossiê está aberto, o Título fica `inert`.

- **Nova partida:** abas Presets e Sandbox. O Tutorial fica numa faixa azul acima da lista, porque é para quem chega agora. Cada Preset mostra Objetivo, prazo e desafio, e o briefing aparece em fonte de máquina de escrever. O Sandbox tem região inicial, capital, Objetivo, prazo (ou lucro alvo, no lucro rápido) e Agências Rivais (0 a 4; o padrão segue a Dificuldade até você mexer). Dificuldade (Recruta, Operador ou Diretor, com a explicação de cada uma) e Modo Hardcore valem para as duas abas. O botão de iniciar fica fixo no rodapé.
- **Continuar:** lista de saves (data, dia da partida, lucro, marca de Hardcore), exportar, apagar com confirmação em dois toques, e importar arquivo com mensagem de erro.
- **Configurações:** idioma, volumes de música e efeitos (aplicados ao vivo), velocidade padrão, silenciar a Analista e reduzir movimento.
- **Créditos:** cada valor começa sob tarja e a tarja recua, linha a linha.

Toque: todo alvo tem pelo menos 44 px, e nada depende de hover (o hover só repete o que o foco já mostra). Em 640×360 tudo cabe; os dossiês rolam por dentro.

## Revisão honesta

O que foi checado no navegador embutido, em 1280×720 e 640×360: os quadros 1,0, 1,3, 2,4, 2,62, 3,05, 3,8, 4,45 e 5,2 da abertura; o pulo por toque (salta para 4,1 e chega ao fim em cerca de 0,6 s); reduzir movimento; inglês; abrir e fechar os quatro dossiês; iniciar uma partida, que grava o save pelo store; e o aviso de som, que some depois do primeiro toque.

Descrição dos quadros:
- **1,3 s:** página sépia cheia de lançamentos sob a luz; metade dos campos já está sob tarja; a linha de escrita fica abaixo do centro. O destaque é a coluna de lançamentos.
- **2,62 s:** close na última linha; uma tarja preta grossa no centro, com os lançamentos acima ampliados e cortados pela borda.
- **3,8 s:** SHADOW LEDGER em tinta sépia, com dois traços vermelhos embaixo, numa pauta do livro; acima, tarjas e "SPACE ×2", "RPG ×20" ampliados. É o quadro para screenshot.
- **5,2 s (Título):** à esquerda, o nome em osso com o traço duplo vermelho e os quatro itens; à direita, o mapa em pontos com uma rota âmbar; atrás, a página escura.

Gates da motionmaxxing:
- **G5 (`lint.mjs`), rodado na prévia com 8 amostras: FAIL em C1, C6 e D1.**
  - C1/C6: as linhas do livro que passam perto da borda superior contam como "rótulo de canto" ou "linha de cabeçalho". Elas são o conteúdo da cena, não chrome, mas a regra é mecânica. O aviso "Toque para pular", na borda de baixo, também entra em C1.
  - D1: o Título é um bloco à esquerda com subitens. É um menu de jogo, que precisa de itens tocáveis; não é um quadro de filme.
  - Fica registrado como falha, não como aprovado.
- **G0, G2 e G3 (`look.py`) não foram rodados.** Eles exigem um vídeo renderizado por `render.mjs`, que pede o runtime de filme da skill, e a abertura é um timeline GSAP dentro do app React. G1 e G4 não se aplicam (não há prova de interface no quadro).

O que ainda dá para melhorar:
- Na passagem (4,1–4,5 s), o nome encolhendo passa por cima das linhas ainda legíveis. Um desfoque leve nas linhas durante a passagem limparia o quadro.
- A abertura não tem som próprio. O navegador só libera áudio depois de um gesto, então ela começa muda; os efeitos `type` e `redact` só tocam se o áudio já estiver liberado.
- Trocar a marca tipográfica pelo `Logo` de `src/art` se o art-kit criar uma versão que caiba na linha do livro. Hoje o nome é texto em Barlow Condensed, com os tokens do art-kit.

## Menos complexidade à vista (2026-10-17)

Regra: o que a maioria precisa fica à vista; o resto abre no toque (`Disclosure` em `controls.tsx` é o `<GDetails>` do kit, com o resumo curto como `hint`). A Dificuldade é um `<GModeSwitch>` (Recruta verde, Operador âmbar, Diretor vermelho) com a linha de rivais abaixo.

- **Nova partida › Cenário**: só o recomendado (Tutorial, com selo "Comece aqui") em destaque, mais o escolhido se for outro; "Ver todos (N)" abre a lista inteira.
- **Nova partida › Diretor**: 6 cartões com retrato, nome, 1 vantagem e 1 desvantagem curtas (`menu.new.origin.<id>.pro/con`); o dossiê completo fica em "Detalhes: <Origem>".
- **Nova partida › Configurar**: nomes e Dificuldade (nome + rivais) à vista; Mundo do Sandbox e Modo Hardcore em "Avançado" (aberto por padrão no Sandbox). O resumo saiu: os passos já mostram as escolhas.
- **Continuar**: cada save mostra só Jogar; Exportar e Apagar abrem no "⋯". Importar arquivo vai para "Avançado" (fica à vista quando não há saves).
- **Configurações**: grupos Jogo (Idioma, Velocidade) e Som (Música, Efeitos); Reduzir movimento, Silenciar a Analista e Instalar o app em "Avançado".
- **Como jogar**: o roteiro dos primeiros 10 minutos vira 5 passos curtos com ícone; o guia inteiro (com a navegação por seções) fica em "Tudo sobre o jogo".
