// Inglês: mesmas chaves do pt-BR (o tipo e o teste falham se faltar alguma). Termos de docs/GLOSSARY-EN.md.
import common from './common';
import uiGame from './ui-game';
import uiHelp from './ui-help';
import uiMarket from './ui-market';
import menu from './menu';
import title from './title';
import app from './app';
import data from './data';
import engine from './engine';
import type ptBR from '../pt-BR';

const en: Record<keyof typeof ptBR, string> = {
  ...common,
  ...uiGame,
  ...uiHelp,
  ...uiMarket,
  ...menu,
  ...title,
  ...app,
  ...data,
  ...engine,
};
export default en;
