// "Como jogar": conteúdo de docs/COMO-JOGAR.md (pt-BR, autoria) com tradução em inglês usando docs/GLOSSARY-EN.md.
// **termo** vira negrito; se o termo estiver em TERM_ICON, ganha o ícone de src/art ao lado.

import type { Lang } from '../types';

export type Block =
  | { p: string }
  | { ol: string[] }
  | { ul: (string | { text: string; sub: string[] })[] }
  | { tip: string };

export interface Section {
  id: string;
  /** Rótulo curto para a navegação. */
  nav: string;
  title: string;
  icon: string;
  highlight?: boolean;
  blocks: Block[];
}

export interface Guide {
  title: string;
  intro: string;
  sectionsLabel: string;
  quickLabel: string;
  sections: Section[];
}

const pt: Guide = {
  title: 'Como jogar',
  sectionsLabel: 'Seções',
  quickLabel: 'Comece por aqui',
  intro:
    'Você é o **Diretor** de uma agência privada de inteligência. Ganha dinheiro comprando mercadorias onde estão baratas e vendendo onde pagam mais, e cresce abrindo **Estações** pelo mundo. O tempo corre sozinho; o jogo pausa quando algo importante acontece.',
  sections: [
    {
      id: 'quick',
      nav: 'Primeiros 10 minutos',
      title: 'Roteiro dos primeiros 10 minutos',
      icon: 'clock',
      highlight: true,
      blocks: [
        {
          ol: [
            'Pause. Compre o item mais barato que você consiga encher no avião (comece com armamento leve).',
            'Escolha um país em guerra civil ou instabilidade (modo **Política** do mapa) e voe para lá.',
            'Venda. Se o preço caiu muito com a venda, guarde o resto para outro país.',
            'Com o lucro, abra uma **Célula** num país grande e movimentado.',
            'Repita o ciclo usando os preços que suas **Estações** revelam, e abra a próxima Estação.',
          ],
        },
      ],
    },
    {
      id: 'start',
      nav: 'Começando',
      title: '1. Começando',
      icon: 'director',
      blocks: [
        {
          ol: [
            'No menu, escolha **Nova partida → Primeiro Contrato** e a dificuldade **Recruta**.',
            'Você começa nos Estados Unidos com um cargueiro (a sua **Frota**), alguns seguranças e um advogado (a sua **Escolta**) e US$ 4 mi em caixa.',
            'Objetivo deste cenário: terminar 90 dias com **Lucro** positivo. Lucro = tudo que você tem hoje (caixa + carga + Estações + Unidades) menos o que tinha no início.',
          ],
        },
      ],
    },
    {
      id: 'time',
      nav: 'Tempo',
      title: '2. Os controles do tempo',
      icon: 'clock',
      blocks: [
        {
          ul: [
            'No canto superior direito: **pausa**, **1×**, **2×** e **4×**.',
            'O jogo pausa sozinho em **Eventos**: chegada de voo, Ameaça, Combate.',
            'Pause sempre que for pensar. Não há penalidade.',
          ],
        },
      ],
    },
    {
      id: 'trade',
      nav: 'Comprar e vender',
      title: '3. O ciclo básico: comprar, voar, vender',
      icon: 'crate',
      blocks: [
        {
          ol: [
            '**Comprar:** no painel da esquerda está o mercado do país onde você está. Toque num item, escolha a quantidade e toque em Comprar. "Compra" é o preço que você paga.',
            '**Espaço no avião:** cada item pesa. A barra da **Frota** mostra quanto do cargueiro já está ocupado (a **Escolta** também ocupa espaço). Aeronaves de combate voam ao lado e não ocupam.',
            '**Voar:** toque em outro país no mapa e depois em Voar para cá. O voo leva horas; países distantes levam mais.',
            '**Vender:** ao chegar, abra o item no mercado e toque em Vender. "Venda" é o que você recebe.',
            '**Saturação:** cada venda derruba o preço daquele item naquele país, e cada compra o encarece. O preço volta ao normal em alguns dias. Não repita a mesma rota sem parar; espalhe as vendas.',
          ],
        },
        { p: '**Onde vender caro?** A política de cada país muda os preços:' },
        {
          ul: [
            '**Guerra:** paga mais por tanques, blindados, helicópteros e caças.',
            '**Guerra civil e instabilidade:** pagam mais por armamento leve (fuzis, metralhadoras) e por mercenários.',
            '**Guerra fria:** paga mais por antiaéreo, caças e informação.',
            '**Países ricos** (nível 4–5) querem itens de alta tecnologia; **países pobres** preferem itens baratos e antigos.',
            'Itens fabricados num país são mais baratos lá.',
          ],
        },
      ],
    },
    {
      id: 'stations',
      nav: 'Estações',
      title: '4. Estações',
      icon: 'station-safehouse',
      blocks: [
        {
          ul: [
            'Toque num país e abra uma **Estação**. Ela começa como **Célula** e pode subir até **Base** (Célula → Casa Segura → Escritório → Complexo → Base).',
            'Uma Estação rende dinheiro todo dia, mostra os preços daquele país de qualquer lugar do mundo (sem ela, você só vê preços onde está) e guarda Unidades que a defendem.',
          ],
        },
        { tip: 'Abra as primeiras Estações em países com preços muito diferentes entre si. Assim você enxerga as melhores rotas.' },
      ],
    },
    {
      id: 'threats',
      nav: 'Reputação e Ameaças',
      title: '5. Reputação, Exposição e Ameaças',
      icon: 'threat',
      blocks: [
        {
          ul: [
            '**Reputação:** como o governo do país vê você. Define se você é **Aliado**, **Neutro** ou **Inimigo do Estado**. Inimigos dificultam sua entrada e atacam suas Estações.',
            '**Exposição:** quanta atenção você chamou ali recentemente. Sobe rápido com operações ilegais e combates, e cai sozinha com o tempo.',
            {
              text: '**Ameaças** chegam com aviso (aba Ameaças): batida policial, processo, ataque criminoso. Você tem alguns dias para reagir: mandar advogados (contra processo e polícia), reforçar a Estação com Unidades, pagar suborno ou evacuar.',
              sub: [
                'Perder para a polícia ou num processo: a Estação fica **Interditada** (para de render até você pagar a multa) e as Unidades ficam **Detidas**.',
                'Perder para criminosos ou militares: a Estação perde um nível; uma Célula é destruída.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'units',
      nav: 'Unidades',
      title: '6. Unidades e Manutenção',
      icon: 'team',
      blocks: [
        {
          ul: [
            'No mercado você também contrata Unidades: guarda-costas, comandos, advogados, **Agentes de Influência**, veículos e aeronaves.',
            'Cada Unidade tem força por tipo de Combate (**Urbano**, **Militar**, **Jurídico**, **Aéreo**) e **Traços** que mudam o desempenho.',
            'Advogados lutam no Combate Jurídico. Agentes de Influência convencem inimigos a trocar de lado.',
            'Toda Unidade cobra **Manutenção** mensal. Exército parado drena o caixa: contrate perto da hora de usar.',
          ],
        },
      ],
    },
    {
      id: 'combat',
      nav: 'Combate',
      title: '7. Combate',
      icon: 'combat-urban',
      blocks: [
        {
          ul: [
            'Acontece quando você é interceptado, quando uma Estação é atacada ou numa Operação Especial.',
            'Antes de lutar, a **Prévia** mostra a chance de vitória. Escolha uma **Tática**: **Assalto** (ataca forte, perde mais), **Defensiva** (segura a linha), **Infiltração** (agentes e influência rendem mais) ou **Negociar** (paga para evitar a luta).',
            'Com o Diretor presente, você pode assumir a grade e posicionar as Unidades. Sem ele, o combate é automático.',
            'Se o Diretor perder, ele fica **Detido** (pelo Estado) ou **Sequestrado** (pelo crime), e você paga para tirá-lo. No **Modo Hardcore**, perder é fim de jogo.',
          ],
        },
      ],
    },
    {
      id: 'late',
      nav: 'Fim de jogo',
      title: '8. Equipes, Operações e o fim de jogo',
      icon: 'tension',
      blocks: [
        {
          ul: [
            '**Equipes:** separe parte da Escolta para agir em outro país sem você, por exemplo roubando tecnologia enquanto você negocia.',
            '**Operações Especiais** (roubo a banco, roubo de tecnologia, **Neutralização**) rendem muito, mas derrubam a Reputação e explodem a Exposição.',
            '**Agências Rivais** jogam pelas mesmas regras: disputam mercados e **Contratos** e podem sabotar você.',
            '**Tensão Global:** guerras e operações empurram o mundo para o limite. No topo, abre-se o mercado mais lucrativo e perigoso do jogo. Se a tensão ficar no máximo tempo demais, vem a **Crise Final**, e todos perdem.',
          ],
        },
      ],
    },
  ],
};

const en: Guide = {
  title: 'How to play',
  sectionsLabel: 'Sections',
  quickLabel: 'Start here',
  intro:
    'You are the **Director** of a private intelligence agency. You make money buying goods where they are cheap and selling where they pay more, and you grow by opening **Stations** around the world. Time runs on its own; the game pauses when something important happens.',
  sections: [
    {
      id: 'quick',
      nav: 'First 10 minutes',
      title: 'Your first 10 minutes',
      icon: 'clock',
      highlight: true,
      blocks: [
        {
          ol: [
            'Pause. Buy the cheapest item you can fill the plane with (start with light arms).',
            'Pick a country in civil war or unrest (the map’s **Politics** mode) and fly there.',
            'Sell. If the price dropped a lot as you sold, keep the rest for another country.',
            'With the profit, open a **Cell** in a large, busy country.',
            'Repeat the loop using the prices your **Stations** reveal, and open the next Station.',
          ],
        },
      ],
    },
    {
      id: 'start',
      nav: 'Getting started',
      title: '1. Getting started',
      icon: 'director',
      blocks: [
        {
          ol: [
            'In the menu, choose **New game → First Contract** and the **Recruit** difficulty.',
            'You start in the United States with a freighter (your **Fleet**), a few guards and a lawyer (your **Escort**) and US$ 4M in cash.',
            'This scenario’s objective: finish 90 days with positive **Profit**. Profit = everything you own today (cash + cargo + Stations + Units) minus what you had at the start.',
          ],
        },
      ],
    },
    {
      id: 'time',
      nav: 'Time',
      title: '2. Time controls',
      icon: 'clock',
      blocks: [
        {
          ul: [
            'Top right: **pause**, **1×**, **2×** and **4×**.',
            'The game pauses itself on **Events**: a flight arriving, a Threat, an Engagement.',
            'Pause whenever you need to think. There is no penalty.',
          ],
        },
      ],
    },
    {
      id: 'trade',
      nav: 'Buy and sell',
      title: '3. The core loop: buy, fly, sell',
      icon: 'crate',
      blocks: [
        {
          ol: [
            '**Buy:** the left panel is the market of the country you are in. Tap an item, choose the quantity and tap Buy. "Buy" is the price you pay.',
            '**Room on the plane:** every item has weight. The **Fleet** bar shows how much of the freighter is in use (your **Escort** takes room too). Combat aircraft fly alongside and take none.',
            '**Fly:** tap another country on the map, then Fly here. Flights take hours; distant countries take longer.',
            '**Sell:** when you land, open the item in the market and tap Sell. "Sell" is what you receive.',
            '**Saturation:** every sale pushes that item’s price down in that country, and every purchase pushes it up. Prices recover in a few days. Don’t run the same route nonstop; spread your sales.',
          ],
        },
        { p: '**Where to sell high?** Each country’s politics shift prices:' },
        {
          ul: [
            '**War:** pays more for tanks, armored vehicles, helicopters and fighters.',
            '**Civil war and unrest:** pay more for light arms (rifles, machine guns) and mercenaries.',
            '**Cold war:** pays more for anti-air, fighters and intelligence.',
            '**Rich countries** (tier 4–5) want high-tech items; **poor countries** prefer cheap, older ones.',
            'Items made in a country are cheaper there.',
          ],
        },
      ],
    },
    {
      id: 'stations',
      nav: 'Stations',
      title: '4. Stations',
      icon: 'station-safehouse',
      blocks: [
        {
          ul: [
            'Tap a country and open a **Station**. It starts as a **Cell** and can grow into a **Base** (Cell → Safehouse → Office → Compound → Base).',
            'A Station earns money every day, shows that country’s prices from anywhere in the world (without one, you only see prices where you are) and houses Units that defend it.',
          ],
        },
        { tip: 'Open your first Stations in countries whose prices differ a lot from each other. That way you see the best routes.' },
      ],
    },
    {
      id: 'threats',
      nav: 'Reputation and Threats',
      title: '5. Reputation, Exposure and Threats',
      icon: 'threat',
      blocks: [
        {
          ul: [
            '**Reputation:** how the country’s government sees you. It decides whether you are an **Ally**, **Neutral** or an **Enemy of the State**. Enemies make it hard to get in and attack your Stations.',
            '**Exposure:** how much attention you have drawn there recently. It rises fast with illegal operations and Engagements, and fades on its own over time.',
            {
              text: '**Threats** come with warning (Threats tab): police raid, lawsuit, criminal attack. You have a few days to react: send lawyers (against lawsuits and police), reinforce the Station with Units, pay a bribe or evacuate.',
              sub: [
                'Lose to the police or in court: the Station is **Seized** (it stops earning until you pay the fine) and its Units are **Detained**.',
                'Lose to criminals or the military: the Station drops one tier; a Cell is destroyed.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'units',
      nav: 'Units',
      title: '6. Units and Upkeep',
      icon: 'team',
      blocks: [
        {
          ul: [
            'The market also lets you hire Units: bodyguards, commandos, lawyers, **Influence Agents**, vehicles and aircraft.',
            'Each Unit has strength per Engagement type (**Urban**, **Military**, **Legal**, **Air**) and **Traits** that change how it performs.',
            'Lawyers fight in Legal Engagements. Influence Agents talk enemies into switching sides.',
            'Every Unit has a monthly **Upkeep**. An idle army drains your cash: hire close to when you need it.',
          ],
        },
      ],
    },
    {
      id: 'combat',
      nav: 'Engagements',
      title: '7. Engagements',
      icon: 'combat-urban',
      blocks: [
        {
          ul: [
            'They happen when you are intercepted, when a Station is attacked or during a Special Operation.',
            'Before fighting, the **Forecast** shows your chance of winning. Choose a **Tactic**: **Assault** (hits hard, loses more), **Hold** (holds the line), **Infiltrate** (agents and influence count for more) or **Negotiate** (pay to avoid the fight).',
            'With the Director present you can take over the grid and place your Units. Without them, the Engagement is Auto-Resolve.',
            'If the Director loses, they are **Detained** (by the state) or **Abducted** (by criminals), and you pay to get them out. In **Hardcore Mode**, losing ends the game.',
          ],
        },
      ],
    },
    {
      id: 'late',
      nav: 'Endgame',
      title: '8. Teams, Operations and the endgame',
      icon: 'tension',
      blocks: [
        {
          ul: [
            '**Teams:** split off part of your Escort to act in another country without you, for example stealing technology while you trade.',
            '**Special Operations** (bank heist, tech theft, **Neutralization**) pay a lot, but they sink your Reputation and blow up your Exposure.',
            '**Rival Agencies** play by the same rules: they compete for markets and **Contracts** and can sabotage you.',
            '**Global Tension:** wars and operations push the world to the brink. At the top, the most profitable and dangerous market in the game opens. If tension stays maxed out for too long, the **Final Crisis** comes, and everyone loses.',
          ],
        },
      ],
    },
  ],
};

export const guideFor = (lang: Lang): Guide => (lang === 'en' ? en : pt);

/** Termo em negrito → ícone de src/art (pt-BR e en). */
export const TERM_ICON: Record<string, string> = {
  diretor: 'director', director: 'director',
  'estações': 'station-safehouse', 'estação': 'station-safehouse', stations: 'station-safehouse', station: 'station-safehouse',
  'célula': 'station-cell', cell: 'station-cell', base: 'station-base',
  frota: 'fleet', fleet: 'fleet',
  escolta: 'team', escort: 'team', equipes: 'team', 'teams:': 'team', 'equipes:': 'team',
  eventos: 'event', events: 'event',
  lucro: 'money', profit: 'money',
  'reputação:': 'reputation', 'reputation:': 'reputation',
  'exposição:': 'exposure', 'exposure:': 'exposure',
  'ameaças': 'threat', threats: 'threat',
  aliado: 'stance-ally', ally: 'stance-ally', neutro: 'stance-neutral', neutral: 'stance-neutral',
  'inimigo do estado': 'stance-enemy', 'enemy of the state': 'stance-enemy',
  interditada: 'seized', seized: 'seized',
  detidas: 'detained', detido: 'detained', detained: 'detained',
  sequestrado: 'abducted', abducted: 'abducted',
  'prévia': 'forecast', forecast: 'forecast',
  assalto: 'tactic-assault', assault: 'tactic-assault',
  defensiva: 'tactic-hold', hold: 'tactic-hold',
  'infiltração': 'tactic-infiltrate', infiltrate: 'tactic-infiltrate',
  negociar: 'tactic-negotiate', negotiate: 'tactic-negotiate',
  urbano: 'combat-urban', urban: 'combat-urban',
  militar: 'combat-army', military: 'combat-army',
  'jurídico': 'combat-legal', legal: 'combat-legal',
  'aéreo': 'combat-air', air: 'combat-air',
  'operações especiais': 'special-op', 'special operations': 'special-op',
  'neutralização': 'neutralization', neutralization: 'neutralization',
  'agências rivais': 'rival', 'rival agencies': 'rival',
  contratos: 'contract', contracts: 'contract',
  'tensão global:': 'tension', 'global tension:': 'tension',
  'crise final': 'final-crisis', 'final crisis': 'final-crisis',
  'agentes de influência': 'influence', 'influence agents': 'influence',
  'manutenção': 'clock', upkeep: 'clock',
  'saturação:': 'money', 'saturation:': 'money',
};
