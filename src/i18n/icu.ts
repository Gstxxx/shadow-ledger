import type { Lang, Params } from './types';

const rules = new Map<Lang, Intl.PluralRules>();
function plural(lang: Lang, n: number): string {
  let r = rules.get(lang);
  if (!r) {
    r = new Intl.PluralRules(lang);
    rules.set(lang, r);
  }
  return r.select(n);
}

/** Lê um bloco {…} balanceado começando em `i` (que aponta para '{'). Retorna [conteúdo, próximo índice]. */
function block(s: string, i: number): [string, number] {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

function render(msg: string, lang: Lang, params: Params): string {
  let out = '';
  let i = 0;
  while (i < msg.length) {
    const ch = msg[i];
    if (ch !== '{') {
      out += ch;
      i++;
      continue;
    }
    const [inner, next] = block(msg, i);
    i = next;
    const m = /^\s*(\w+)\s*(?:,\s*plural\s*,([\s\S]*))?$/.exec(inner);
    if (!m) {
      out += `{${inner}}`;
      continue;
    }
    const [, name, body] = m;
    const v = params[name];
    if (body === undefined) {
      out += v === undefined ? `{${name}}` : String(v);
      continue;
    }
    // Plural: "=0 {…} one {…} other {…}"; "#" vira o número.
    const n = Number(v ?? 0);
    const cases: Record<string, string> = {};
    let k = 0;
    while (k < body.length) {
      const mm = /\s*([=\w]+)\s*\{/.exec(body.slice(k));
      if (!mm) break;
      const start = k + mm.index + mm[0].length - 1;
      const [content, after] = block(body, start);
      cases[mm[1]] = content;
      k = after;
    }
    const chosen = cases[`=${n}`] ?? cases[plural(lang, n)] ?? cases.other ?? '';
    out += render(chosen.replace(/#/g, String(n)), lang, params);
  }
  return out;
}

export function format(msg: string, lang: Lang, params?: Params): string {
  if (!params && !msg.includes('{')) return msg;
  return render(msg, lang, params ?? {});
}
