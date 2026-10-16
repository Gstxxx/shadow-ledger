import { useCallback, useSyncExternalStore } from 'react';
import ptBR from './pt-BR';
import en from './en';
import * as F from './format';
import { format } from './icu';
import type { Dict, Lang, Params } from './types';
import { LANGS } from './types';

export type Key = keyof typeof ptBR & string;

const DICTS: Record<Lang, Dict> = { 'pt-BR': ptBR, en };

const STORAGE_KEY = 'sl.lang';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang;
  } catch {
    /* sem storage */
  }
  const nav = typeof navigator !== 'undefined' ? (navigator.languages?.[0] ?? navigator.language ?? '') : '';
  return nav.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

let current: Lang = detectLang();
const listeners = new Set<() => void>();

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* sem storage */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function translate(lang: Lang, key: Key, params?: Params): string {
  const msg = DICTS[lang][key] ?? (ptBR as Dict)[key] ?? key;
  return format(msg, lang, params);
}

/** Tradução no idioma atual (fora de React). Em componentes, prefira `useT()` para reagir à troca. */
export const t = (key: Key, params?: Params): string => translate(current, key, params);

/** Formatadores presos ao idioma atual (fora de React). */
export const fmt = {
  num: (n: number, o?: Intl.NumberFormatOptions) => F.num(current, n, o),
  money: (n: number) => F.money(current, n),
  moneyFull: (n: number) => F.moneyFull(current, n),
  amount: (n: number) => F.amount(current, n),
  pct: (v: number) => F.pct(current, v),
  tons: (n: number) => F.tons(current, n),
  date: (ms: number, style?: 'short' | 'long') => F.date(current, ms, style),
};

export const useLang = (): Lang => useSyncExternalStore(subscribe, getLang, getLang);

export interface I18n {
  lang: Lang;
  t: (key: Key, params?: Params) => string;
  fmt: typeof fmt;
  setLang: (l: Lang) => void;
}

/** Hook reativo: o componente re-renderiza quando o idioma muda. */
export function useT(): I18n {
  const lang = useLang();
  const tt = useCallback((key: Key, params?: Params) => translate(lang, key, params), [lang]);
  return {
    lang,
    t: tt,
    setLang,
    fmt: {
      num: (n, o) => F.num(lang, n, o),
      money: (n) => F.money(lang, n),
      moneyFull: (n) => F.moneyFull(lang, n),
      amount: (n) => F.amount(lang, n),
      pct: (v) => F.pct(lang, v),
      tons: (n) => F.tons(lang, n),
      date: (ms, s) => F.date(lang, ms, s),
    },
  };
}

export const dictionaries = DICTS;
