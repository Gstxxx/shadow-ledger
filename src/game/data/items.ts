import type { ItemDef, Strength, UnitClass } from '../types';

const S = (p: Partial<Strength>): Strength => ({ legal: 0, urban: 0, army: 0, air: 0, convert: 0, ...p });

type Def = Omit<ItemDef, 'str' | 'tradable' | 'fieldable'> & {
  str?: Partial<Strength>;
  tradable?: boolean;
  fieldable?: boolean;
};

const fieldOnly: UnitClass[] = ['lawyer', 'influence', 'cargo'];
const tradeOnly: UnitClass[] = ['arms', 'special'];

const defs: Def[] = [
  // ── Pessoal ───────────────────────────────────────────
  { id: 'bodyguard', name: 'Guarda-costas', cls: 'human', rank: 0, price: 40_000, weight: 0.1, str: { urban: 2, army: 1 }, blurb: 'Proteção pessoal barata e leal enquanto o pagamento cair.' },
  { id: 'thug', name: 'Pistoleiro de Aluguel', cls: 'human', rank: 0, price: 25_000, weight: 0.1, str: { urban: 3, army: 1 }, blurb: 'Bom de rua, péssimo de disciplina.' },
  { id: 'police', name: 'Policial Mercenário', cls: 'human', rank: 1, price: 60_000, weight: 0.1, str: { urban: 3, army: 2, legal: 1 }, blurb: 'Conhece procedimento, distintivo e atalhos.' },
  { id: 'swat', name: 'Operador Tático', cls: 'human', rank: 2, price: 150_000, weight: 0.12, str: { urban: 5, army: 3, legal: 1 }, blurb: 'Ex-força especial de polícia. Entra primeiro.' },
  { id: 'soldier', name: 'Soldado Contratado', cls: 'human', rank: 1, price: 50_000, weight: 0.12, str: { urban: 2, army: 3 }, blurb: 'Infantaria padrão para combate em campo aberto.' },
  { id: 'commando', name: 'Comando de Elite', cls: 'human', rank: 3, price: 320_000, weight: 0.12, str: { urban: 6, army: 5, air: 1 }, blurb: 'Treinado para qualquer terreno. Caro e decisivo.' },
  { id: 'agent', name: 'Agente de Campo', cls: 'human', rank: 2, price: 250_000, weight: 0.1, str: { urban: 5, army: 2, legal: 2 }, fieldable: true, tradable: false, blurb: 'Espião versátil: infiltração, contatos e um pouco de lei.' },
  { id: 'lawyer1', name: 'Advogado Associado', cls: 'lawyer', rank: 1, price: 80_000, weight: 0.08, str: { legal: 3 }, blurb: 'Segura multas e processos simples.' },
  { id: 'lawyer2', name: 'Advogada Sênior', cls: 'lawyer', rank: 2, price: 220_000, weight: 0.08, str: { legal: 5 }, blurb: 'Transforma auditorias em atrasos intermináveis.' },
  { id: 'lawyer3', name: 'Sócio de Escritório Internacional', cls: 'lawyer', rank: 3, price: 550_000, weight: 0.08, str: { legal: 8 }, blurb: 'Tem o telefone de três ministros da justiça.' },
  { id: 'liaison1', name: 'Agente de Influência', cls: 'influence', rank: 1, price: 70_000, weight: 0.07, str: { convert: 3 }, blurb: 'Conversa certa na hora certa: vira Unidades inimigas para o seu lado.' },
  { id: 'liaison2', name: 'Agente de Influência Veterano', cls: 'influence', rank: 2, price: 190_000, weight: 0.07, str: { convert: 5 }, blurb: 'Converte unidades inimigas em combate urbano, militar e jurídico.' },
  { id: 'liaison3', name: 'Mestre de Influência', cls: 'influence', rank: 3, price: 450_000, weight: 0.07, str: { convert: 7 }, blurb: 'Lealdades mudam quando entra na sala.' },

  // ── Veículos ──────────────────────────────────────────
  { id: 'patrolcar', name: 'Viatura Interceptadora', cls: 'vehicle', rank: 0, price: 120_000, weight: 2.5, str: { urban: 4, army: 2 }, blurb: 'Rápida no asfalto, frágil no resto.' },
  { id: 'technical', name: 'Picape Armada', cls: 'vehicle', rank: 0, price: 90_000, weight: 2.5, str: { urban: 4, army: 2 }, blurb: 'O veículo de guerra mais popular do mundo.' },
  { id: 'apc', name: 'Blindado 6x6', cls: 'vehicle', rank: 1, price: 900_000, weight: 12, str: { urban: 5, army: 5 }, origin: ['276', '250', '643'], blurb: 'Transporte blindado de tropa.' },
  { id: 'ifv', name: 'Blindado de Combate', cls: 'vehicle', rank: 2, price: 1_900_000, weight: 15, str: { urban: 6, army: 7, air: 1 }, origin: ['840', '752', '276'], blurb: 'Canhão automático e mísseis leves.' },
  { id: 'tank1', name: 'Carro de Combate Clássico', cls: 'vehicle', rank: 1, price: 2_200_000, weight: 40, str: { urban: 4, army: 8 }, origin: ['643', '804', '156'], blurb: 'Velho, pesado e ainda perigoso.' },
  { id: 'tank3', name: 'Tanque de 4ª Geração', cls: 'vehicle', rank: 3, price: 6_800_000, weight: 58, str: { urban: 6, army: 12, air: 1 }, origin: ['840', '276', '410', '826'], blurb: 'Blindagem composta e mira digital.' },
  { id: 'sam1', name: 'Bateria Antiaérea Móvel', cls: 'antiair', rank: 1, price: 1_200_000, weight: 10, str: { army: 2, air: 6 }, origin: ['643', '156'], blurb: 'Nega o céu a helicópteros e caças leves.' },
  { id: 'sam3', name: 'Sistema SAM de Longo Alcance', cls: 'antiair', rank: 3, price: 5_200_000, weight: 26, str: { army: 1, air: 11 }, origin: ['840', '643', '376'], blurb: 'Fecha o espaço aéreo de um país inteiro.' },

  // ── Aeronaves ─────────────────────────────────────────
  { id: 'heli1', name: 'Helicóptero Utilitário', cls: 'heli', rank: 1, price: 2_100_000, weight: 5, str: { urban: 4, army: 4, air: 3 }, origin: ['643', '250'], blurb: 'Leva tropa, metralhadora na porta.' },
  { id: 'heli3', name: 'Helicóptero de Ataque', cls: 'heli', rank: 3, price: 19_000_000, weight: 8, str: { urban: 7, army: 9, air: 5 }, origin: ['840', '380'], blurb: 'Caçador de blindados.' },
  { id: 'jet1', name: 'Caça Leve', cls: 'jet', rank: 1, price: 12_000_000, weight: 9, str: { urban: 2, army: 3, air: 6 }, origin: ['076', '380', '410'], blurb: 'Escolta aérea acessível. Voa ao lado do cargueiro.' },
  { id: 'jet2', name: 'Caça Multimissão', cls: 'jet', rank: 2, price: 34_000_000, weight: 15, str: { urban: 4, army: 6, air: 10 }, origin: ['840', '250', '752', '643'], blurb: 'Superioridade aérea e ataque ao solo.' },
  { id: 'jet3', name: 'Caça Furtivo', cls: 'jet', rank: 3, price: 92_000_000, weight: 18, str: { urban: 4, army: 7, air: 14 }, origin: ['840'], blurb: 'Ninguém o vê chegar.' },
  { id: 'bomber', name: 'Bombardeiro Tático', cls: 'jet', rank: 2, price: 41_000_000, weight: 22, str: { urban: 5, army: 10, air: 4 }, origin: ['643', '826'], blurb: 'Apaga uma coluna blindada em uma passada.' },

  // ── Cargueiros (frota própria) ────────────────────────
  { id: 'cargo0', name: 'Turboélice de Carga', cls: 'cargo', rank: 0, price: 3_000_000, weight: 8, speed: 520, blurb: '8 t de capacidade, pousa em qualquer pista.' },
  { id: 'cargo1', name: 'Jato de Carga Médio', cls: 'cargo', rank: 1, price: 12_000_000, weight: 16, speed: 820, origin: ['840', '076'], blurb: '16 t, rápido e confiável.' },
  { id: 'cargo2', name: 'Cargueiro Widebody', cls: 'cargo', rank: 2, price: 38_000_000, weight: 36, speed: 900, origin: ['840', '250'], blurb: '36 t para operações sérias.' },
  { id: 'cargo3', name: 'Cargueiro Estratégico', cls: 'cargo', rank: 3, price: 110_000_000, weight: 120, speed: 760, origin: ['804', '643'], blurb: '120 t. Leva tanques como bagagem de mão.' },

  // ── Armamento leve (só comércio, caixas de 100) ───────
  { id: 'rifles', name: 'Fuzis de Assalto (cx. 100)', cls: 'arms', rank: 0, price: 60_000, weight: 0.5, origin: ['643', '156', '688'], blurb: 'A moeda corrente de toda guerra civil.' },
  { id: 'mg', name: 'Metralhadoras (cx. 100)', cls: 'arms', rank: 1, price: 140_000, weight: 1.2, origin: ['276', '076', '792'], blurb: 'Demanda alta em zonas de conflito.' },
  { id: 'rpg', name: 'Lança-foguetes (cx. 100)', cls: 'arms', rank: 2, price: 420_000, weight: 1.4, origin: ['643', '804'], blurb: 'Nivela o jogo contra blindados.' },
  { id: 'atgm', name: 'Mísseis Antitanque Guiados (cx. 100)', cls: 'arms', rank: 3, price: 1_600_000, weight: 1.8, origin: ['840', '376', '250'], blurb: 'Tecnologia cara, lucro alto onde há tanques.' },

  // ── Informação e programas (só comércio) ──────────────
  { id: 'intel', name: 'Relatório de Inteligência', cls: 'special', rank: 0, price: 300_000, weight: 0.01, blurb: 'Rotas, nomes, horários.' },
  { id: 'docs', name: 'Documentação Técnica', cls: 'special', rank: 1, price: 900_000, weight: 0.02, blurb: 'Plantas e manuais de sistemas militares.' },
  { id: 'secret', name: 'Segredo de Estado', cls: 'special', rank: 2, price: 2_800_000, weight: 0.01, blurb: 'Vale ouro para o vizinho certo.' },
  { id: 'tech', name: 'Pacote de Tecnologia', cls: 'special', rank: 2, price: 5_500_000, weight: 0.3, blurb: 'Código-fonte e protótipos de defesa.' },
  { id: 'space', name: 'Programa Espacial', cls: 'special', rank: 3, price: 24_000_000, weight: 1, blurb: 'Dados de lançadores e satélites.' },

  // ── Armas de Destruição em Massa (só comércio, só com Tensão Global alta) ──
  { id: 'chem', name: 'Agente Químico (lote)', cls: 'special', rank: 3, price: 18_000_000, weight: 1.5, wmd: true, blurb: 'Precursores militares. Ninguém admite ter comprado.' },
  { id: 'bio', name: 'Agente Biológico (amostras)', cls: 'special', rank: 3, price: 30_000_000, weight: 0.2, wmd: true, blurb: 'Frascos lacrados e um protocolo de contenção que ninguém segue.' },
  { id: 'nuclear', name: 'Material Nuclear', cls: 'special', rank: 3, price: 65_000_000, weight: 2, wmd: true, blurb: 'O item mais perigoso do mercado negro.' },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  defs.map((d) => [
    d.id,
    {
      ...d,
      str: S(d.str ?? {}),
      tradable: d.tradable ?? !fieldOnly.includes(d.cls),
      fieldable: d.fieldable ?? !tradeOnly.includes(d.cls),
    } as ItemDef,
  ]),
);

export const ITEM_LIST = Object.values(ITEMS);

/** Air units fly alongside the cargo planes and use no cargo space. */
export const usesCargo = (it: ItemDef) => it.cls !== 'jet' && it.cls !== 'cargo';

export const isHumanLike = (it: ItemDef) => it.cls === 'human' || it.cls === 'lawyer' || it.cls === 'influence';

export const CLASS_LABEL: Record<UnitClass, string> = {
  human: 'Pessoal',
  lawyer: 'Jurídico',
  influence: 'Agente de Influência',
  vehicle: 'Veículo',
  antiair: 'Antiaéreo',
  heli: 'Helicóptero',
  jet: 'Aeronave',
  cargo: 'Cargueiro',
  arms: 'Armamento',
  special: 'Informação',
};

/** Items a country can steal-reward by level. */
export const STEAL_TABLE = ['intel', 'docs', 'docs', 'secret', 'tech'];
