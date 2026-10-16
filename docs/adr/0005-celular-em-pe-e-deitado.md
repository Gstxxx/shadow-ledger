---
status: accepted
---

# Celular em pé e deitado

Substitui a parte de orientação do ADR 0003. O jogo no celular passa a funcionar também **em pé (retrato)**, além de deitado. O usuário pediu uma versão vertical depois de ver o jogo rodando, porque é como as pessoas seguram o celular na maior parte do tempo.

## Consequences

- O manifest deixa de travar a orientação (`"orientation": "any"`), e o aviso "gire o aparelho" sai.
- **Em pé (referência mínima 360×640):** o mapa ocupa a metade de cima. Os painéis (país/Mercado, agência) viram uma folha inferior arrastável com abas. A barra superior fica compacta, com caixa, data e velocidade, e os detalhes vão para um toque. A grade de Combate gira para avançar de baixo para cima (o jogador embaixo, o inimigo em cima), mantendo as mesmas regras.
- **Deitado** continua como no ADR 0003, com gavetas laterais.
- O resto do ADR 0003 continua valendo: toque com alvos ≥ 44 px, nada só em hover, save sem servidor.
