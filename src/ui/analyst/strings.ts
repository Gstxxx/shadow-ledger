// Textos da Analista. Lê os dicionários da área `analyst` direto, para não depender do registro em
// src/i18n/*/index.ts (feito pela sessão de i18n): funciona antes e depois dele.
import { useCallback } from 'react';
import { useLang } from '../../i18n';
import type { Lang, Params } from '../../i18n';
import { format } from '../../i18n/icu';
import en from '../../i18n/en/analyst';
import ptBR from '../../i18n/pt-BR/analyst';

export type AnalystKey = keyof typeof ptBR;

const DICTS: Record<Lang, Record<string, string>> = { 'pt-BR': ptBR, en };

export function translateAnalyst(lang: Lang, key: AnalystKey, params?: Params): string {
  return format(DICTS[lang]?.[key] ?? ptBR[key] ?? key, lang, params);
}

/** `t` da Analista no idioma atual; re-renderiza na troca de idioma. */
export function useAnalystT() {
  const lang = useLang();
  return useCallback((key: AnalystKey, params?: Params) => translateAnalyst(lang, key, params), [lang]);
}

export const hasAnalystKey = (k: string): k is AnalystKey => k in ptBR;

/** Chave dinâmica (montada a partir de um id) validada contra o dicionário. */
export const akey = (k: string): AnalystKey => (hasAnalystKey(k) ? k : 'analyst.event.intel');
