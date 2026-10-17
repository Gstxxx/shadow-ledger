// pt-BR é a fonte da verdade das chaves. Cada área vive em seu arquivo; `as const` mantém as chaves tipadas.
import common from './common';
import uiGame from './ui-game';
import uiHelp from './ui-help';
import uiMarket from './ui-market';
import uiGear from './ui-gear';
import menu from './menu';
import title from './title';
import app from './app';
import data from './data';
import engine from './engine';
import analyst from './analyst';

const ptBR = { ...common, ...uiGame, ...uiHelp, ...uiMarket, ...uiGear, ...menu, ...title, ...app, ...data, ...engine, ...analyst } as const;
export default ptBR;
