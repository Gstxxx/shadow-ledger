// Inglês: mesmas chaves do pt-BR (o tipo e o teste falham se faltar alguma). Termos de docs/GLOSSARY-EN.md.
import common from './common';
import type ptBR from '../pt-BR';

const en: Record<keyof typeof ptBR, string> = { ...common };
export default en;
