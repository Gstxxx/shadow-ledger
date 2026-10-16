// Atalhos tipados sobre t() para textos de DADOS indexados por id, e renderização de mensagens do motor
// guardadas como { key, params }. Não importa nada de src/game.
import { dictionaries, getLang, translate } from './core';
import type { Key } from './core';
import * as F from './format';
import type { Lang, Params } from './types';

/** Existe a chave no dicionário base (pt-BR é a fonte da verdade)? */
const has = (key: string): boolean => key in dictionaries['pt-BR'];

/** Texto por chave dinâmica; se a chave não existe (id desconhecido), devolve `fallback`. */
function lookup(key: string, fallback: string, lang: Lang, params?: Params): string {
  return has(key) ? translate(lang, key as Key, params) : fallback;
}

// ── Itens, países, Traços ─────────────────────────────────────

export const itemName = (id: string, lang: Lang = getLang()): string => lookup(`item.${id}.name`, id, lang);
export const itemBlurb = (id: string, lang: Lang = getLang()): string => lookup(`item.${id}.blurb`, '', lang);
/** Classe da Unidade: 'human' | 'lawyer' | 'influence' | 'vehicle' | 'antiair' | 'heli' | 'jet' | 'cargo' | 'arms' | 'special'. */
export const classLabel = (cls: string, lang: Lang = getLang()): string => lookup(`class.${cls}`, cls, lang);

/** `iso` é o id numérico do dado (ex.: '076'). */
export const countryName = (iso: string, lang: Lang = getLang()): string => lookup(`country.${iso}.name`, iso, lang);
/** 'NA' | 'SA' | 'EU' | 'AF' | 'ME' | 'AS' | 'OC'. */
export const continentName = (code: string, lang: Lang = getLang()): string => lookup(`continent.${code}`, code, lang);

export const traitName = (id: string, lang: Lang = getLang()): string => lookup(`trait.${id}.name`, id, lang);
export const traitBlurb = (id: string, lang: Lang = getLang()): string => lookup(`trait.${id}.blurb`, '', lang);

// ── Rótulos de enums ──────────────────────────────────────────

/** Nível de Estação 1..5: Célula, Casa Segura, Escritório, Complexo, Base. */
export const stationName = (level: number, lang: Lang = getLang()): string => lookup(`station.${level}.name`, String(level), lang);
export const politicsLabel = (id: string, lang: Lang = getLang()): string => lookup(`politics.${id}`, id, lang);
export const postureLabel = (id: string, lang: Lang = getLang()): string => lookup(`posture.${id}`, id, lang);
export const combatLabel = (type: string, lang: Lang = getLang()): string => lookup(`combat.${type}`, type, lang);
export const threatLabel = (kind: string, lang: Lang = getLang()): string => lookup(`threat.${kind}`, kind, lang);
export const operationLabel = (kind: string, lang: Lang = getLang()): string => lookup(`operation.${kind}.name`, kind, lang);
export const operationBlurb = (kind: string, lang: Lang = getLang()): string => lookup(`operation.${kind}.blurb`, '', lang);
export const difficultyLabel = (d: number, lang: Lang = getLang()): string => lookup(`difficulty.${d}`, String(d), lang);
export const objectiveLabel = (kind: string, lang: Lang = getLang()): string => lookup(`objective.${kind}`, kind, lang);
/** 'low' | 'medium' | 'high' | 'top'. */
export const tensionBandLabel = (band: string, lang: Lang = getLang()): string => lookup(`tension.band.${band}`, band, lang);
export const tacticName = (id: string, lang: Lang = getLang()): string => lookup(`tactic.${id}.name`, id, lang);
export const tacticBlurb = (id: string, lang: Lang = getLang()): string => lookup(`tactic.${id}.blurb`, '', lang);
export const factionLabel = (id: string, lang: Lang = getLang()): string => lookup(`faction.${id}`, id, lang);
export const personalityLabel = (id: string, lang: Lang = getLang()): string => lookup(`personality.${id}`, id, lang);
export const presetTitle = (id: string, lang: Lang = getLang()): string => lookup(`preset.${id}.title`, id, lang);
export const presetBrief = (id: string, lang: Lang = getLang()): string => lookup(`preset.${id}.brief`, '', lang);

// ── Nomes por índice (posição nos arrays de src/game/data/names.ts e ai/profiles.ts) ──

type NameList = 'callsign' | 'group' | 'hostage' | 'buyer' | 'team' | 'agency' | 'rival';
export const listedName = (list: NameList, index: number, lang: Lang = getLang()): string =>
  lookup(`name.${list}.${index}`, '', lang);

// ── Mensagens do motor guardadas como { key, params } ─────────

/**
 * Parâmetro que o motor guarda como referência (id), resolvido só na hora de exibir, no idioma atual.
 * Assim o Relatório, os Eventos e o log de Combate salvos se traduzem ao trocar o idioma.
 */
export type Ref =
  | { country: string }
  | { item: string }
  | { trait: string }
  | { station: number }
  | { threat: string }
  | { op: string }
  | { personality: string }
  | { listed: NameList; index: number }
  | { money: number }
  | { num: number }
  | { tons: number }
  | { msg: Msg }
  /** Sufixo de baixas do Combate: '' se nenhuma; senão ' 2 fora de ação (…); 1 convertida(s)….' */
  | { casualty: { downed: number; turned: number } };

export type MsgParams = Record<string, string | number | Ref>;

/** Mensagem do motor: chave de msg.* mais parâmetros (strings, números ou Ref). */
export interface Msg {
  key: Key;
  params?: MsgParams;
}

function resolve(v: string | number | Ref, lang: Lang): string | number {
  if (typeof v === 'string' || typeof v === 'number') return v;
  if ('country' in v) return countryName(v.country, lang);
  if ('item' in v) return itemName(v.item, lang);
  if ('trait' in v) return traitName(v.trait, lang);
  if ('station' in v) return stationName(v.station, lang);
  if ('threat' in v) return threatLabel(v.threat, lang);
  if ('op' in v) return operationLabel(v.op, lang);
  if ('personality' in v) return personalityLabel(v.personality, lang);
  if ('listed' in v) return listedName(v.listed, v.index, lang);
  if ('money' in v) return F.moneyFull(lang, v.money);
  if ('num' in v) return F.num(lang, v.num);
  if ('tons' in v) return F.tons(lang, v.tons);
  if ('msg' in v) return renderMsg(v.msg, lang);
  const { downed, turned } = v.casualty;
  const parts: string[] = [];
  if (downed) parts.push(translate(lang, 'msg.combat.casualtyDowned' as Key, { n: downed }));
  if (turned) parts.push(translate(lang, 'msg.combat.casualtyTurned' as Key, { n: turned }));
  return parts.length ? ' ' + translate(lang, 'msg.combat.casualtyLine' as Key, { parts: parts.join('; ') }) : '';
}

/** Texto final de uma mensagem do motor, no idioma pedido (padrão: o atual). */
export function renderMsg(m: Msg, lang: Lang = getLang()): string {
  if (!m.params) return translate(lang, m.key);
  const out: Params = {};
  for (const [k, v] of Object.entries(m.params)) out[k] = resolve(v, lang);
  return translate(lang, m.key, out);
}
