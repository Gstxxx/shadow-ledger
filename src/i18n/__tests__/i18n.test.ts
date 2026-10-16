import { describe, expect, it } from 'vitest';
import ptBR from '../pt-BR';
import en from '../en';
import { format } from '../icu';
import * as F from '../format';
import { translate } from '../core';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

describe('dicionários', () => {
  const ptKeys = Object.keys(ptBR);
  const enDict = en as Record<string, string>;

  it('en tem todas as chaves do pt-BR', () => {
    const missing = ptKeys.filter((k) => !(k in enDict) || enDict[k].trim() === '');
    expect(missing, `faltam em en: ${missing.join(', ')}`).toEqual([]);
  });

  it('en não tem chaves órfãs', () => {
    const extra = Object.keys(enDict).filter((k) => !(k in ptBR));
    expect(extra, `sobram em en: ${extra.join(', ')}`).toEqual([]);
  });

  it('en usa os mesmos parâmetros do pt-BR', () => {
    const bad = ptKeys.filter((k) => {
      const a = placeholders((ptBR as Record<string, string>)[k]);
      const b = placeholders(enDict[k] ?? '');
      return a.join() !== b.join();
    });
    expect(bad, `parâmetros divergentes: ${bad.join(', ')}`).toEqual([]);
  });

  it('en não repete texto em português nos termos do glossário', () => {
    const banned = /\b(Equipe|Estação|Estações|Exposição|Combate|Cenário|Preset|Diretor Recruta|Prévia|Frota|Carga|Cofre)\b/;
    const bad = ptKeys.filter((k) => banned.test(enDict[k] ?? ''));
    expect(bad, `termo em pt no en: ${bad.join(', ')}`).toEqual([]);
  });
});

describe('format (interpolação e plural)', () => {
  it('interpola parâmetros', () => {
    expect(format('Dia {n} de {total}', 'en', { n: 3, total: 90 })).toBe('Dia 3 de 90');
  });
  it('plural pt-BR e en', () => {
    const msg = '{n, plural, =0 {nenhum} one {# dia} other {# dias}}';
    expect(format(msg, 'pt-BR', { n: 0 })).toBe('nenhum');
    expect(format(msg, 'pt-BR', { n: 1 })).toBe('1 dia');
    expect(format(msg, 'pt-BR', { n: 5 })).toBe('5 dias');
    expect(format('{n, plural, one {# day} other {# days}}', 'en', { n: 1 })).toBe('1 day');
    expect(format('{n, plural, one {# day} other {# days}}', 'en', { n: 2 })).toBe('2 days');
  });
  it('plural com parâmetro aninhado', () => {
    expect(format('{n, plural, one {{who} tem # item} other {{who} têm # itens}}', 'pt-BR', { n: 2, who: 'Eles' })).toBe(
      'Eles têm 2 itens',
    );
  });
  it('chave ausente cai para pt-BR e depois para a própria chave', () => {
    expect(translate('en', 'common.back')).toBe('Back');
    expect(translate('pt-BR', 'common.day', { n: 7 })).toBe('Dia 7');
    expect(translate('en', 'nao.existe' as never)).toBe('nao.existe');
  });
});

describe('formatação por idioma', () => {
  it('moeda', () => {
    expect(F.money('pt-BR', 1_200_000)).toBe('US$ 1,2 mi');
    expect(F.money('en', 1_200_000)).toBe('$1.2M');
    expect(F.money('pt-BR', 850_000)).toBe('US$ 850 mil');
    expect(F.money('en', 850_000)).toBe('$850K');
    expect(F.money('pt-BR', -12_400_000)).toBe('−US$ 12,4 mi');
    expect(F.money('en', 2_500_000_000)).toBe('$2.5B');
    expect(F.money('en', 3)).toBe('$0');
  });
  it('moeda completa, percentual e toneladas', () => {
    expect(F.moneyFull('en', 1234567)).toBe('$1,234,567');
    expect(F.moneyFull('pt-BR', 1234567)).toBe('US$ 1.234.567');
    expect(F.pct('en', 0.456)).toBe('46%');
    expect(F.tons('pt-BR', 4.25)).toBe('4,3 t');
    expect(F.tons('en', 4.25)).toBe('4.3 t');
    expect(F.amount('en', 1_500_000)).toBe('1.5M');
  });
});
