# Agências Rivais simétricas no visível, abstratas na logística

As Agências Rivais executam as mesmas ações que o jogador (comprar e vender com Saturação, abrir e subir Estações, montar Equipes, Operações Especiais), passando pelas mesmas funções do motor e pagando os mesmos custos. Mas a logística do Diretor rival (peso de Carga, capacidade e rota exata da Frota) é abstraída. Escolhemos isso porque o jogador percebe e sente tudo o que é simétrico: o mercado que a rival saturou foi saturado de verdade, e a Base dela foi paga. Já fazer a IA planejar rotas e carga custaria caro e tenderia a produzir comportamento visivelmente burro.

## Considered Options

- **Simetria total:** a IA planeja rota e carga como o jogador. Mais elegante, mas cara e frágil.
- **Rivais "trapaceiros":** fluxo de dinheiro e eventos próprios. Fácil de equilibrar, mas o jogador nota Bases surgindo do nada.

## Consequences

- Toda ação de jogo precisa ser exposta como função do motor parametrizada pela agência que age, nunca acoplada ao jogador.
- A Dificuldade ajusta a qualidade das escolhas da IA, a agressividade e o capital inicial, não as regras.
