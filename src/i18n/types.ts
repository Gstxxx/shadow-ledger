export type Lang = 'pt-BR' | 'en';

export const LANGS: readonly Lang[] = ['pt-BR', 'en'];

/** Nome do idioma na própria língua (para o seletor). */
export const LANG_LABEL: Record<Lang, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };

export type Params = Record<string, string | number>;

/** Dicionário plano: chave com pontos → mensagem (suporta {param} e plural ICU simplificado). */
export type Dict = Record<string, string>;
