// Mensagens estruturadas do motor (Msg = { key, params }) e o modo compatível: o texto pt-BR
// continua nos campos de texto (LogEntry.text, GameEvent.title/body, Result.msg…), renderizado por `say`.
import { dictionaries } from '../i18n';
import type { Key } from '../i18n';
import { renderMsg } from '../i18n/lookup';
import type { Msg, MsgParams } from '../i18n/lookup';

export type { Msg, MsgParams };

/** Monta uma Msg do motor. */
export const M = (key: Key, params?: MsgParams): Msg => (params ? { key, params } : { key });

/** Refs (resolvidos na exibição, no idioma atual). */
export const ref = {
  country: (id: string) => ({ country: id }),
  item: (id: string) => ({ item: id }),
  money: (n: number) => ({ money: Math.round(n) }),
  station: (level: number) => ({ station: level }),
  threat: (kind: string) => ({ threat: kind }),
  op: (kind: string) => ({ op: kind }),
  trait: (id: string) => ({ trait: id }),
  num: (n: number) => ({ num: n }),
  msg: (m: Msg) => ({ msg: m }),
  casualty: (downed: number, turned: number) => ({ casualty: { downed, turned } }),
};

/** Texto pt-BR de uma mensagem do motor (modo compatível: os campos de texto continuam em pt). */
export const say = (m: Msg): string => renderMsg(m, 'pt-BR');

/** Texto pt de uma string ou Msg. */
export const textOf = (m: string | Msg): string => (typeof m === 'string' ? m : say(m));
/** Msg de uma chave dinâmica (dados indexados por id); se a chave não existe, devolve o texto `fallback`. */
export function keyRef(key: string, fallback: string, params?: MsgParams): string | { msg: Msg } {
  return key in dictionaries['pt-BR'] ? { msg: params ? { key: key as Key, params } : { key: key as Key } } : fallback;
}

/** Título de Combate: texto pt (compatível) + Msg. */
export const titled = (m: Msg) => ({ title: say(m), titleMsg: m });
