# Shadow Ledger

Jogo de estratégia em tempo contínuo com pausa sobre dirigir uma agência privada de inteligência que negocia armas, informação e mercenários pelo mundo. É um remake web das mecânicas de *Guns Girls Lawyers Spies*, com nomes, textos e arte novos.

## Language

### Agência e pessoas

**Diretor**:
O jogador encarnado: uma única pessoa que viaja com a **Frota**. Ao perder um **Combate** fica **Detido** (se o vencedor for o Estado) ou **Sequestrado** (se for o crime); só morre no **Modo Hardcore**.
_Avoid_: presidente, chefe, jogador (quando se fala do personagem)

**Sequestrado**:
Estado do **Diretor** capturado por criminosos ou por um grupo inimigo; sai mediante resgate pago ou resgate armado por uma **Equipe**. Diferente de **Detida**, que é prisão pelo Estado.
_Avoid_: capturado, refém

**Modo Hardcore**:
Opção de partida em que a derrota do **Diretor** em **Combate** é morte e fim de jogo.

**Unidade**:
Qualquer recurso de combate da agência (pessoa, veículo ou aeronave), com forças por tipo de combate e experiência. Toda Unidade tem **Manutenção**.
_Avoid_: tropa, soldado (exceto como tipo específico)

**Traço**:
Característica permanente de uma pessoa do **Pessoal** que altera seu desempenho ou custo. Nasce com 1–2 e ganha mais ao subir de patente. Máquinas não têm Traços.
_Avoid_: perk, habilidade, talento

**Ferida**:
Estado temporário de uma pessoa do **Pessoal** que perdeu um duelo: fica fora de ação até se recuperar, mais rápido numa **Estação**. Não é morte nem **Detida**.
_Avoid_: machucada, incapacitada

**Danificada**:
Estado de uma máquina avariada em **Combate**; precisa de conserto pago numa **Estação** de nível Escritório ou maior. Equivalente mecânico de **Ferida**.
_Avoid_: quebrada, avariada

**Manutenção**:
Custo mensal de manter uma **Unidade**: salário para o **Pessoal**, manutenção técnica para máquinas. Se não for paga, o **Pessoal** deserta e as máquinas ficam paradas.
_Avoid_: upkeep, salário (quando se fala de máquinas)

**Escolta**:
O conjunto de **Unidades** que viaja com o **Diretor** a bordo da **Frota**.
_Avoid_: guarda pessoal, comitiva

**Equipe**:
Um grupo de **Unidades** destacado da **Escolta** ou de uma **Estação** que se desloca sozinho, sem o **Diretor**.
_Avoid_: esquadrão, time, força-tarefa

**Estação**:
Instalação fixa da agência em um país, que gera renda, informa preços e pode abrigar **Unidades de Estação**.
_Avoid_: base (exceto como nível de estação), filial

**Unidade de Estação**:
**Unidade** alocada a uma **Estação**, que a defende e ataca grupos inimigos que entram no país.

**Nível de Estação**:
Porte de uma **Estação**, do menor ao maior: Célula, Casa Segura, Escritório, Complexo e Base. Define capacidade, renda, defesa fixa e alcance da informação.
_Avoid_: tipo de estação, tier

**Interditada**:
Estado de uma **Estação** apreendida pelo Estado após perder um **Combate** de **Ameaça** policial ou jurídica: não rende nem informa até a multa ser paga ou um recurso ser vencido. Diferente de perder **Nível de Estação**, que é o resultado de ataques criminosos ou militares.
_Avoid_: fechada, bloqueada

**Detida**:
Estado de uma **Unidade** presa pelo Estado (por exemplo, numa **Estação** **Interditada**); fica fora de ação, mas pode ser recuperada.
_Avoid_: capturada, presa, morta

**Agência Rival**:
Outra agência controlada pela IA, com Diretor, **Estações** e **Equipes** próprios, que compete por mercados e **Contratos** e age contra a agência do jogador. Quantas existem e quão agressivas são depende da **Dificuldade**.
_Avoid_: inimigo, concorrente, IA (quando se fala da agência)

### Partida

**Sandbox**:
Forma de jogar em mundo aberto configurável (região inicial, capital, **Agências Rivais**, objetivo, prazo). É a única forma de jogo no lançamento.
_Avoid_: modo livre, partida personalizada

**Preset**:
Configuração pronta de **Sandbox** com nome e briefing (ex.: "Caçada no Sahel"). As missões do jogo original viram Presets.
_Avoid_: missão, cenário, fase

**Objetivo**:
Condição de vitória de uma partida: lucro em N dias, lucro rápido, eliminar um grupo, resgatar um refém, entre outras.
_Avoid_: missão, meta

**Campanha**:
Sequência futura de partidas com história, que carrega parte do progresso de uma para a próxima. Não existe no lançamento.
_Avoid_: história, modo história

**Dificuldade**:
Nível escolhido no início da partida (Recruta, Operador, Diretor) que, entre outras coisas, define o número e a agressividade das **Agências Rivais**.
_Avoid_: modo (reservado para **Modo Hardcore**)

### Relação com os países

**Reputação**:
Como o governo de um país vê a agência; muda devagar e define a **Postura** do país. Uma por país.
_Avoid_: status, standing, relação

**Postura**:
Faixa da **Reputação**: Aliado, Neutro ou Inimigo do Estado.
_Avoid_: status da agência

**Exposição**:
Quanta atenção as ações recentes da agência chamaram em um país; sobe rápido e decai sozinha. Uma por país, independente da **Reputação**.
_Avoid_: heat, suspeita, calor

**Ameaça**:
Ação hostil anunciada com antecedência contra a agência em um país (batida, processo, ataque criminoso), gerada pela **Exposição** e pela situação política.
_Avoid_: ataque aleatório

### Ações

**Operação Especial**:
Ação hostil contra um país: roubo a banco, roubo de tecnologia ou eliminação política. Pode ser executada pelo **Diretor** (com a **Escolta**) ou por uma **Equipe**, e derruba a reputação da agência naquele país.
_Avoid_: missão (reservado para o objetivo da partida), ataque

**Golpe**:
Derrubada do governo de um país. Exige o **Diretor** presente; não é uma **Operação Especial**.
_Avoid_: coup

**Comércio**:
Compra e venda de **Carga** em um mercado nacional. Exclusivo do **Diretor**; uma **Equipe** nunca comercia.

**Saturação**:
Queda de preço em um mercado nacional causada pelas vendas da própria agência (ou alta causada pelas compras), que se dissipa com o tempo.

**Contrato**:
Pedido de um comprador em um país por uma quantidade de um item até um prazo, com prêmio acima do mercado e efeito na **Reputação**. É complemento do **Comércio**, não a fonte principal de lucro.
_Avoid_: missão, encomenda, pedido

### Combate

**Combate**:
Confronto entre **Unidades** da agência e forças hostis, sempre simulado na mesma grade e de um tipo só: Jurídico, Urbano, Militar ou Aéreo.
_Avoid_: batalha, luta (informal)

**Tática**:
Escolha feita antes de um **Combate** (Assalto, Defensiva, Infiltração ou Negociar) que modifica como ele se desenrola.
_Avoid_: postura tática, estratégia, Postura (que é faixa de Reputação)

**Combate Automático**:
**Combate** em que o jogo posiciona as **Unidades** por você. É como lutam as **Equipes** e as **Estações** quando o **Diretor** não está presente; com o **Diretor** presente, o jogador pode assumir a grade.

**Prévia**:
Estimativa da chance de vitória de um **Combate**, mostrada antes de escolher a **Tática**.

### Tempo

**Evento**:
Acontecimento que exige atenção do jogador (chegada, ameaça, combate, oferta) e pausa o relógio automaticamente.
_Avoid_: alerta, notificação (essas são formas de exibir um Evento)

### Logística

**Frota**:
Os cargueiros do **Diretor**. A capacidade total limita a **Carga** mais a **Escolta**, e a velocidade é a do cargueiro mais lento.
_Avoid_: avião (quando se fala do conjunto)

**Carga**:
Mercadorias compradas para revenda, transportadas pela **Frota**.
_Avoid_: estoque, inventário

**Cofre**:
Depósito de itens de uma **Estação**, com capacidade crescente por **Nível de Estação**. Recebe o que uma **Equipe** captura e a **Carga** que o **Diretor** deixa; só o **Diretor** retira.
_Avoid_: armazém, depósito, inventário

**Receptador**:
Intermediário que compra na hora, com forte desconto, um item que uma **Equipe** acabou de capturar. É a alternativa, escolhida pelo jogador, a levar o item a um **Cofre**; não é **Comércio**.
_Avoid_: mercado negro, fence

**Pessoal**:
**Unidades** humanas (guarda-costas, comandos, agentes, advogados, agentes de influência), em oposição a veículos e aeronaves.
_Avoid_: humanos, infantaria

**Voo Comercial**:
Transporte pago por pessoa, de velocidade fixa, que uma **Equipe** formada só por **Pessoal** pode usar sem depender da **Frota**.

**Cargueiro Destacado**:
Cargueiro retirado da **Frota** para levar uma **Equipe**, o que permite incluir veículos. Enquanto estiver destacado, não conta na capacidade nem na velocidade da **Frota**.

## Example dialogue

> **Dev:** "Se o Diretor está no Brasil, uma Equipe pode estar no México ao mesmo tempo?"
> **Domain expert:** "Pode. A Equipe saiu da Escolta ou de uma Estação e se desloca sozinha; o Diretor continua no Brasil com a Frota e a Carga."
> **Dev:** "E ela pode roubar um banco lá e vender a Carga que pegou?"
> **Domain expert:** "Roubar o banco sim, é uma Operação Especial, e o combate é automático. Vender não: Comércio é só do Diretor. Golpe também só com o Diretor lá."
