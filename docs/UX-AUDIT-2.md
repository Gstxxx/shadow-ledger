# Auditoria de UI nº 2: tela de jogo (palco ADR 0006)

Uma única passada, sem implementar nada.

## Fontes e evidências

- **Regras usadas:**
  - Web Interface Guidelines (vercel-labs, `command.md` baixado em 17/10/2026);
  - `docs/UX-RULES.md`;
  - `redesign-existing-projects` (o que denuncia uma tela "de template");
  - `industrial-brutalist-ui`, só como referência estética: blueprint desclassificado, grade rígida, contraste extremo de escala.
- **Build:** produção local (dist em `localhost:5221`), não o site da Vercel.
- **Código:** varredura com grep em `src/ui/game`. Estão limpos de `transition: all`, de `outline: none` sem foco substituto e de `user-scalable`.
- **Screenshots:** reaproveitam as capturas feitas hoje no build local, para economizar orçamento:
  - `item-grafico-440.jpg`
  - `mercado-modos-360-comprar.jpg`
  - `agencia-440-diretor.jpg`
  - `ilustracao-932x430-item.jpg`

  Todas estão em `side-session-notes/local_55c2ceff…/`.

Prioridade = impacto para o jogador × esforço (B = baixo, M = médio, A = alto). A ordem é do mais valioso ao menos valioso.

| # | Tela | Problema | Regra violada | Correção proposta | Imp. × Esf. |
|---|------|----------|---------------|-------------------|-------------|
| 1 | Modal de item (`item-grafico-440`) | Em pé, a ilustração ocupa ~270 px antes do veredito, e o número grande e o botão Comprar/Vender ficam abaixo da dobra em 360×640. A decisão exige rolar. | UX-RULES 1 (veredito no topo) e 3 (uma ação primária à vista) | Em pé com altura < 700 px, limitar a imagem a 140 px (ou miniatura à esquerda do título) e manter o botão primário em rodapé sticky (`.g-modal__foot`). | Alto × B |
| 2 | Todas as telas | O texto secundário em `--paper-3` (#7f7a70) sobre o fundo #14181d dá cerca de 4,0:1, e há 15 regras com 9–10 px (legendas do gráfico, `tb-cap`, `trade-sub`). Abaixo de 4,5:1 em texto pequeno. | Guidelines (contraste e legibilidade) e UX-RULES 6 | Subir `--paper-3` para ~#99938a (≥ 4,5:1) e adotar 11 px como piso de texto informativo. 10 px só para eixos de gráfico. | Alto × B |
| 3 | Palco e modais | O modal aberto e a aba não ficam na URL. Recarregar ou usar o "voltar" do navegador fecha tudo. Não dá para deep-link para "País › Mercado". | Guidelines: "URL reflects state" e "deep-link stateful UI" | Espelhar `stage.current` em `?m=country:MX:market` via `history.replaceState`/`pushState`, e fazer `popstate` chamar `stage.back()`. | Alto × M |
| 4 | Ficha de Unidade | Ainda é um modal próprio (`.ud-scrim` com `<div onClick>`), fora do palco. Não tem voltar, empilha sobre o País e deitado as ações ficam no fim da rolagem. | Guidelines: `<div onClick>`; ADR 0006 (um modal por vez) | Migrar para `StageModal { kind: 'unit' }` com GModal lg e `onBack`, que a etapa 3 do ADR já prevê. O scrim vira o do GModal. | Alto × M |
| 5 | Mercado › Comprar (`mercado-modos-360`) | Cada linha repete "Armamento · 1,2 t/un" e "≈ na média · poucos dados" (até 3 linhas de texto miúdo por item). Só um selo diz algo diferente. | UX-RULES 2 e 4 (etiquetas curtas, sem frases) | Tirar a categoria (a aba já diz) e trocar "poucos dados" por um ícone ⓘ no selo. A linha fica: miniatura · nome · selo · preço. | Médio × B |
| 6 | Mapa (palco) | Os marcadores (Estação, Rivais, Diretor) têm 10–25 px, abaixo do alvo de 44 px. Tocar num país às vezes pega o país vizinho. | Guidelines: alvos de toque; ADR 0003 (≥ 44 px) | Dar a cada `GMapMarker` um `<circle r=22/inv fill=transparent>` como área de toque e priorizar o marcador sobre o país no `onPick`. | Médio × B |
| 7 | HUD | Em pé, a Tensão Global some, e é ela que avisa da Crise e do risco de ADM. Não há sinal dela fora do desktop. | UX-RULES 1 (o jogador precisa saber se está em perigo) | Pôr um ponto/selo na barra de ações ("Ameaças") ou no relógio quando a Tensão passa do limiar de ADM, com o rótulo no toque. | Médio × B |
| 8 | Verdict (kit) | O ícone do veredito é decorativo, mas `role="status"` lê a frase inteira a cada render (por exemplo, quando o preço muda com o relógio). Leitores de tela ficam tagarelas. | Guidelines: `aria-live` só para atualização assíncrona relevante | Usar `role="none"` em vereditos estáticos (País, Agência) e `status` só nos que mudam por ação do jogador. | Médio × B |
| 9 | Gráfico de preço | A legenda tem 4 itens em 11 px e o "Você pagou" pontilhado some sobre a média tracejada quando os valores se cruzam. Faltam alternativa tabular e teclado (crosshair só por ponteiro). | dataviz: legenda e tabela; Guidelines: teclado | Mostrar "Você pagou" como rótulo direto à direita (como Compra/Venda), aceitar ←/→ no `svg` (`tabIndex=0`) e pôr a tabela dos últimos 7 dias em Detalhes. | Médio × M |
| 10 | Palco (todas as telas) | Fica um código morto: `BottomSheet.tsx`, `CountryPanel` e `AgencyPanel` legados, e as regras de `.gsheet` e `.side` em `portrait.css`/`safe.css`. Isso aumenta o CSS e confunde quem mexe. | redesign-existing-projects (dívida de layout antiga) | A etapa 4 do ADR 0006: remover os arquivos e as regras mortas. `portrait.css` fica só com o que o Combate e os modais usam. | Médio × M |
| 11 | Abas do modal País (deitado) | "Operações Especiais" quebra em 2 linhas na aba lateral e perde o ícone. As abas laterais têm larguras diferentes. | Guidelines: conteúdo longo e truncamento | Rótulo curto ("Operações", pedir a chave à deploy) e `min-width` igual às outras abas laterais, com `text-overflow`. | Baixo × B |
| 12 | Modais deitados (932×430) | O botão primário às vezes fica no fim da rolagem interna (Agência › Escolta com 5+ Unidades, ficha). | UX-RULES 3; Guidelines: "sticky… must not cover" | Garantir o rodapé sticky do GModal em todas as telas do palco. As ações dentro do veredito sobem com o veredito. | Baixo × B |
| 13 | Teletipo do Relatório | Só fica truncado ("A FROTA DECOLOU DE ESTADOS UNIDOS RU…") e não há como ler a linha inteira sem abrir a lista. | Guidelines: conteúdo longo | Fazer marquee lento (respeitando reduced-motion) ou abrir a última linha num `GTip` no toque. | Baixo × B |
| 14 | Estética (referência brutalista) | O palco mistura três sotaques: âmbar de comando, cartões com cantos chanfrados e chips arredondados (Neutro, Preços ao vivo). Falta a grade rígida de "blueprint". | industrial-brutalist-ui: grade, escala tipográfica contrastante, utilitarismo | Padronizar os chips como etiquetas retas em mono maiúscula, alinhar os modais a uma grade de 8 px com fios de 1 px, e usar o título do modal maior (32/40) contra o miúdo mono, como num dossiê. | Baixo × M |
| 15 | Tipografia e cópia | Há textos com reticências "..." e verbos inconsistentes ("Ver detalhes", "Detalhes", "Ver todos"). Os números monetários não usam `tabular-nums` em todas as listas. | Guidelines: Typography e Content & Copy | Trocar "..." por "…" no i18n, padronizar os verbos e aplicar `font-variant-numeric: tabular-nums` em `.num` globalmente. | Baixo × B |

## Top 5 para atacar primeiro

1. Imagem herói menor em pé e Comprar/Vender sempre à vista (#1).
2. Contraste e piso de 11 px no texto secundário (#2).
3. Modal e aba na URL, com o voltar do navegador (#3).
4. Ficha de Unidade dentro do palco (#4).
5. Linhas do Mercado enxutas (#5).
