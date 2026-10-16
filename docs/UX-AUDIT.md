# Auditoria de UX da tela de jogo

Build auditado: https://shadow-ledger-delta.vercel.app (commit `3529245`), em 2026-10-16.
Roteiro: menu → Nova partida → Primeiro Contrato (Operador) → comprar fuzis nos EUA → voar ao Brasil → vender → abrir Célula → painel da Agência (Frota, Contratos, Equipes, Ameaças) → Roubo a banco → Prévia de Combate.
Telas: 1440×900 (medido via DOM), 1024×768 (pane) e 640×360 (celular deitado, ADR 0003).

Prioridade = impacto para um jogador **novo** nos primeiros 10 minutos. P0 bloqueia ou faz perder dinheiro sem entender; P1 confunde; P2 é acabamento.

## P0 — o jogador perde dinheiro ou não sabe o que fazer

### 1. Não existe "próximo passo"
- **O que se vê:** a partida começa com 15 linhas de mercado, um mapa escuro e nenhuma indicação do que fazer. O Relatório no rodapé fala de um Contrato no Peru e de uma Agência Rival no Egito.
- **Causa:** a tela é só inventário. Nada traduz o estado (caixa, carga, preços conhecidos) em uma ação sugerida.
- **Correção:** um cartão **"O que fazer agora"** fixo no topo do mapa, calculado do estado: carga vazia → "Compre algo barato aqui"; carga cheia → "Brasil paga +12% por Fuzis — voar para lá? (15 h)"; chegou → "Venda aqui: +US$ 180 mil"; Ameaça anunciada → "Batida em 2 d no Brasil — defender ou sair". Botão de ação direta no cartão.

### 2. O mercado não diz se você está lucrando
- **O que se vê:** comprei 15 cx de fuzis a ~US$ 60 mil (paguei US$ 0,9 mi). No Brasil o botão principal âmbar diz "Vender US$ 764 mil" — prejuízo de ~US$ 130 mil, sem nenhum aviso. Ainda nos EUA, logo depois de comprar, o mesmo botão âmbar "Vender US$ 819 mil" convida a vender com prejuízo.
- **Causa:** a linha mostra só Compra/Venda locais. O preço médio pago não aparece; a cor primária vai para Vender sempre que há carga.
- **Correção:** cada linha mostra **"pago US$ 60 mil → aqui US$ 59 mil (−2%)"** em verde/vermelho e o resultado total da venda ("−US$ 130 mil"). Vender só fica primário quando dá lucro; com prejuízo vira botão neutro com o valor em vermelho.

### 3. Botões habilitados sem efeito ou sem explicação
- **O que se vê:** "Vender US$ 50 mil" aparece habilitado-aparente com 0 em carga; depois de comprar 15, "Comprar US$ 1,1 mi" fica cinza sem dizer por quê (a Frota está a 7,9 de 8,0 t). "Voar para cá" falhou duas vezes sem mudança visível (toast curto, fora do foco).
- **Causa:** o estado desabilitado não diz o motivo; erros vão para um toast que some.
- **Correção:** todo botão desabilitado leva o motivo no próprio rótulo ou logo abaixo ("Frota cheia: 7,9/8 t"). Stepper com máximo real (`min(caixa, capacidade)`) e uma barra de capacidade ao lado.

### 4. Lucro no topo sem contexto
- **O que se vê:** sem fazer nada o Lucro sobe de US$ 3.675 para US$ 11 mil; ao abrir a Célula cai para −US$ 89 mil. "US$ 3.675" parece 3,6 mil ou 3,6 mi conforme o leitor.
- **Causa:** Lucro mede patrimônio (caixa + carga) contra o início, mas isso não está escrito em lugar nenhum; não há meta visível.
- **Correção:** Lucro com barra de progresso até a meta do Preset ("US$ 11 mil de US$ 4 mi") e um "?" que explica a conta. Formatação sempre com unidade curta (mil/mi).

### 5. 640×360: as gavetas cobrem o mapa e perdem o contexto
- **O que se vê:** as duas gavetas abrem juntas e tapam o mapa; a do país abre no meio da rolagem, sem o nome do país; a barra superior some com objetivo, dias e lucro; abas da Agência viram ícones sem rótulo.
- **Causa:** gavetas independentes, `hide-xs` esconde dado essencial, rolagem preservada entre países.
- **Correção:** uma gaveta por vez (abrir uma fecha a outra); cabeçalho do país fixo (sticky) e rolagem volta ao topo ao trocar de país; barra superior fina com Caixa + progresso do Objetivo + relógio; abas com rótulo curto de 11px.

## P1 — confunde

### 6. Mapa pequeno, rótulos ilegíveis, Diretor difícil de achar
- Em 1440×900 os painéis ocupam 744 px e o mapa 696×848 (retrato) — o mapa-múndi fica com metade da altura vazia. Rótulos do mapa medem **6,8 px**. O Diretor é um ponto âmbar igual aos outros.
- **Correção:** marcador próprio do Diretor (ícone `director` com halo), rótulos com tamanho mínimo de 11px em tela, botão "Centralizar no Diretor", e enquadramento inicial na região do Preset.

### 7. Países sem nome, sem teclado e sem prévia
- Só países "jogáveis" respondem ao clique, sem tooltip nem nome acessível; não há como saber que um país é clicável antes de clicar. A rota e o tempo de voo só aparecem no painel, depois de clicar.
- **Correção:** destaque de hover/foco, folha de toque com nome, Postura, preço conhecido do que está na carga e "Voar (15 h)". Rota tracejada prevista no mapa enquanto o país está selecionado.

### 8. Camadas do mapa sem legenda
- Postura/Exposição/Política trocam as cores sem dizer o que significam.
- **Correção:** legenda compacta sob os botões de camada (3 amostras com rótulo).

### 9. Jargão sem glossário
- Reputação, Exposição, Saturação, Postura, "força hostil ~25", "U2 M1", "Assumir a grade", "Cofre". A Saturação aparece como "+20%" verde no preço de **venda** logo após uma compra (é o preço subindo por causa da sua compra), o que parece uma boa notícia.
- **Correção:** ícone "?" ao lado dos termos com definição de uma frase (texto de `CONTEXT.md`), acessível por toque e teclado. Saturação vira um indicador próprio ("mercado saturado por você: −8%, recupera em ~3 d").

### 10. Modal para evento rotineiro
- "Chegada: Brasil" para o jogo com um modal que exige clique.
- **Correção:** chegadas e rotinas viram toast/cartão de próximo passo; modal só para Eventos que pedem decisão.

### 11. Operações Especiais oferecidas sem chance real
- Com Escolta de força 4 o jogo deixa abrir Roubo a banco (força 27) e só a Prévia mostra 0% em todas as Táticas.
- **Correção:** o cartão da Operação mostra "sua força 4 vs. 27 — inviável" em vermelho antes do clique; a seção fica recolhida para quem ainda não tem Escolta de combate.

### 12. Contratos sem caminho
- A oferta "2× Helicóptero Utilitário · Peru · US$ 6,1 mi" não diz onde comprar o item, quanto custa nem se cabe na Frota.
- **Correção:** linha "Onde comprar: Brasil ~US$ 1,1 mi cada · cabe 0/2" e botão "Mostrar no mapa".

## P2 — acabamento

13. Pausa: o botão Play fica âmbar, mas o relógio não muda; adicionar selo "PAUSADO" e esmaecer o relógio.
14. "Cofre · 0,0 t de 1,0 tvazio" (falta espaço) e unidades de peso misturadas (t, cx).
15. Linhas de mercado com subtítulo em 10–11px e contraste baixo (`--sl-text-faint` em texto informativo).
16. Atalhos (espaço, 1/2/4, Esc) existem mas não aparecem em lugar nenhum; mostrar no `title`/aria e numa linha do menu de pausa.
17. Foco de teclado: países no SVG e linhas do mercado sem anel de foco visível.
18. Ícones do kit (`GameIcon`) não são usados no mercado nem nas abas; lucide genérico no lugar.

## Plano da Fase 2 (src/ui/game)
1. Cartão "O que fazer agora" + destaque de oportunidade no mapa (P0-1).
2. Mercado em linhas legíveis com ícone, pago vs. aqui, Saturação, stepper com motivo (P0-2, P0-3).
3. Barra superior com progresso do Objetivo e Lucro explicado (P0-4).
4. Gavetas exclusivas e cabeçalho fixo em 640×360 (P0-5).
5. Mapa: marcador do Diretor, legenda, rótulos legíveis, folha de país com rota prevista (P1-6…8).
6. Glossário "?" e toasts mais claros (P1-9, P1-10).
7. Acessibilidade: foco visível, atalhos anunciados (P2).

APIs que talvez precisem vir do motor (pedir à sessão game-builder): preço médio pago por item na Carga (`cargo` já guarda lotes? confirmar), motivo de bloqueio de compra/venda/voo como função pura (`whyCantBuy(s, a, itemId, qty): string | null`).
