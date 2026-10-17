---
status: accepted
---

# Mapa como palco, conteúdo em modais centrais com abas

A tela de jogo deixa de ser um painel de controle com várias colunas (painéis laterais, gavetas, folha inferior) e passa a ser o **mapa em tela cheia como palco**. O jogador vê **um único conteúdo por vez, no centro**: um modal grande, organizado por **abas**. O usuário pediu isso depois de jogar no iPhone. Painéis laterais e folhas comprimiam o conteúdo e confundiam, e um modal central dá espaço, foco e cara de jogo.

Substitui as partes de layout dos ADRs 0003 e 0005 (gavetas laterais e folha inferior). O resto deles continua valendo: toque com alvos ≥ 44 px, áreas seguras do iOS, em pé e deitado.

## Consequences

- **Sempre na tela:** o mapa, um HUD fino (Caixa, Lucro vs. Meta, data e velocidade, menu), uma barra de ações compacta (ex.: País, Mercado, Agência, Ameaças) e o Relatório em forma de teletipo.
- **Tocar num país ou numa ação** abre um modal central com abas. Exemplos:
  - País: Visão geral, Mercado, Operações e Estação.
  - Agência: Diretor, Frota, Escolta, Estações, Equipes e Contratos.
  - Item do mercado: o modal de compra e venda.
- **Um modal por vez:** abrir outro substitui o atual, com histórico de voltar. O mapa continua visível atrás, escurecido, e fechar devolve o foco a ele.
- **Combate, Eventos, ficha de Unidade e Operação/Prévia** também seguem o padrão de modal central.
- **Celular:** deitado, o modal ocupa quase a tela inteira, com as abas na lateral ou no topo. Em pé, ocupa a tela inteira com as abas no topo.
