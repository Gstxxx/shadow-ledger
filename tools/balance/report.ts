// Agrega os GameResult em tabelas Markdown (vão para tools/balance/out/report.md e docs/BALANCE.md).
import { DIFFICULTY_LABEL, PRESETS } from '../../src/game/data/rules';
import { BOT_IDS, BOT_LABEL } from './bots';
import type { BotId } from './bots';
import type { CombatSample, GameResult } from './harness';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const mi = (n: number) => (Number.isFinite(n) ? `${(n / 1e6).toFixed(1)}` : '—');
const num = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');

function table(head: string[], rows: (string | number)[][]): string {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

export function winTable(rs: GameResult[]): string {
  const rows: string[][] = [];
  for (const p of PRESETS) {
    for (const d of [1, 2, 3] as const) {
      const cell = rs.filter((r) => r.preset === p.id && r.difficulty === d);
      if (!cell.length) continue;
      rows.push([
        `${p.title} (${p.objective})`,
        DIFFICULTY_LABEL[d],
        ...BOT_IDS.map((b) => {
          const g = cell.filter((r) => r.bot === b);
          return g.length ? `${pct(mean(g.map((r) => (r.won ? 1 : 0))))} · ${mi(median(g.map((r) => r.finalProfit)))}` : '—';
        }),
      ]);
    }
  }
  return table(['Preset', 'Dific.', ...BOT_IDS.map((b) => BOT_LABEL[b])], rows);
}

export function botSummary(rs: GameResult[]): string {
  const rows = BOT_IDS.map((b) => {
    const g = rs.filter((r) => r.bot === b);
    // profitByDay chega amostrado a cada 10 dias (runner.slim).
    const at = (d: number) => median(g.filter((r) => r.profitByDay.length > d / 10).map((r) => r.profitByDay[d / 10]));
    const perDay = median(g.map((r) => r.finalProfit / Math.max(1, r.days)));
    return [
      BOT_LABEL[b],
      g.length,
      pct(mean(g.map((r) => (r.won ? 1 : 0)))),
      mi(at(30)),
      mi(at(60)),
      mi(at(90)),
      num(perDay / 1000),
      num(mean(g.map((r) => r.operations)), 1),
      num(mean(g.map((r) => r.directorCaptured)), 2),
    ];
  });
  return table(['Bot', 'Partidas', 'Vitórias', 'Lucro d30 (M)', 'd60 (M)', 'd90 (M)', 'Lucro/dia (mil)', 'Operações', 'Diretor preso'], rows);
}

export function stationTable(rs: GameResult[]): string {
  const rows = BOT_IDS.filter((b) => rs.some((r) => r.bot === b && r.firstStationDay !== undefined)).map((b) => {
    const g = rs.filter((r) => r.bot === b && r.firstStationDay !== undefined);
    const paid = g.filter((r) => r.firstStationPaybackDays !== undefined);
    return [
      BOT_LABEL[b],
      g.length,
      num(median(g.map((r) => r.firstStationDay!))),
      mi(median(g.map((r) => r.firstStationCost!))),
      num(median(paid.map((r) => r.firstStationPaybackDays!))),
      pct(paid.length / g.length),
      pct(mean(g.map((r) => (r.firstStationLost ? 1 : 0)))),
      num(mean(g.map((r) => r.stationsOpened)), 1),
    ];
  });
  return table(['Bot', 'Partidas c/ Estação', '1ª Estação (dia)', 'Investido (M)', 'Payback bruto (dias, mediana)', 'Pagou-se no prazo', 'Perdida', 'Estações abertas'], rows);
}

export function threatTable(rs: GameResult[]): string {
  const kinds = ['raid', 'lawsuit', 'criminal', 'military'] as const;
  const rows = BOT_IDS.map((b) => {
    const g = rs.filter((r) => r.bot === b);
    const days = g.reduce((x, r) => x + r.days, 0);
    const all = g.flatMap((r) => r.threats);
    const fought = all.filter((t) => t.outcome === 'repelled' || t.outcome === 'lost');
    return [
      BOT_LABEL[b],
      num((all.length / Math.max(1, days)) * 30, 2),
      ...kinds.map((k) => num((all.filter((t) => t.kind === k).length / Math.max(1, days)) * 30, 2)),
      pct(all.filter((t) => t.outcome === 'bribed').length / Math.max(1, all.length)),
      pct(all.filter((t) => t.outcome === 'missed').length / Math.max(1, all.length)),
      pct(fought.filter((t) => t.outcome === 'lost').length / Math.max(1, fought.length)),
      pct(all.filter((t) => t.outcome === 'lost').length / Math.max(1, all.length)),
    ];
  });
  return table(
    ['Bot', 'Ameaças/30d', 'Batida', 'Processo', 'Crime', 'Militar', 'Subornadas', 'Sem alvo', 'Derrota nos combates', 'Letalidade (perda/ameaça)'],
    rows,
  );
}

export function threatByDifficulty(rs: GameResult[]): string {
  const rows = ([1, 2, 3] as const).map((d) => {
    const g = rs.filter((r) => r.difficulty === d && r.bot !== 'passivo' && r.bot !== 'aleatorio');
    const days = g.reduce((x, r) => x + r.days, 0);
    const all = g.flatMap((r) => r.threats);
    return [
      DIFFICULTY_LABEL[d],
      num((all.length / Math.max(1, days)) * 30, 2),
      num(mean(all.map((t) => t.strength)), 1),
      pct(all.filter((t) => t.outcome === 'lost').length / Math.max(1, all.length)),
    ];
  });
  return table(['Dificuldade', 'Ameaças/30d', 'Força média', 'Letalidade'], rows);
}

export function calibration(samples: CombatSample[]): { md: string; maxGap: number; bias: number; brier: number } {
  const edges = [0, 0.2, 0.4, 0.6, 0.8, 1.0001];
  const rows: (string | number)[][] = [];
  let maxGap = 0;
  for (let i = 0; i < edges.length - 1; i++) {
    const b = samples.filter((x) => x.preview >= edges[i] && x.preview < edges[i + 1]);
    if (!b.length) continue;
    const p = mean(b.map((x) => x.preview));
    const w = mean(b.map((x) => (x.won ? 1 : 0)));
    const t = mean(b.map((x) => x.truth));
    if (b.length >= 30) maxGap = Math.max(maxGap, Math.abs(p - w));
    rows.push([`${Math.round(edges[i] * 100)}–${Math.round(Math.min(1, edges[i + 1]) * 100)}%`, b.length, pct(p), pct(t), pct(w), `${num((w - p) * 100, 1)} pp`]);
  }
  const bias = mean(samples.map((x) => (x.won ? 1 : 0) - x.preview));
  const brier = mean(samples.map((x) => (x.preview - (x.won ? 1 : 0)) ** 2));
  const md = table(['Faixa da Prévia', 'Combates', 'Prévia média', 'Reestimada (240 sim.)', 'Vitória real', 'Real − Prévia'], rows);
  return { md, maxGap, bias, brier };
}

export function tensionTable(rs: GameResult[], label = (r: GameResult) => BOT_LABEL[r.bot]): string {
  const groups = new Map<string, GameResult[]>();
  for (const r of rs) groups.set(label(r), [...(groups.get(label(r)) ?? []), r]);
  const rows = [...groups].map(([k, g]) => {
    const top = g.filter((r) => r.firstTopTensionDay !== undefined);
    return [
      k,
      g.length,
      num(median(g.map((r) => r.maxTension))),
      num(mean(g.map((r) => r.daysAtOrAbove75)), 1),
      pct(top.length / g.length),
      num(median(top.map((r) => r.firstTopTensionDay!))),
      num(median(g.map((r) => r.longestTopStreakDays))),
      pct(mean(g.map((r) => (r.crisis ? 1 : 0)))),
    ];
  });
  return table(['Grupo', 'Partidas', 'Tensão máx (mediana)', 'Dias no Topo (≥ 75)', 'Chegou ao Topo', 'Dia do Topo (mediana)', 'Maior sequência no Topo (d)', 'Crise Final'], rows);
}

export function upkeepTable(rs: GameResult[]): string {
  const rows = BOT_IDS.map((b) => {
    const g = rs.filter((r) => r.bot === b);
    const up = g.flatMap((r) => r.upkeepByMonth);
    const inc = g.flatMap((r) => r.stationIncomeByMonth);
    const tradeMonth = median(g.map((r) => (r.finalProfit / Math.max(1, r.days)) * 30));
    return [BOT_LABEL[b], mi(median(up) / 1) + '', mi(median(inc)), mi(tradeMonth), pct(mean(g.map((r) => (r.monthsUnpaid > 0 ? 1 : 0))))];
  });
  return table(['Bot', 'Manutenção/mês (M)', 'Renda Estações/mês (M)', 'Lucro líquido/mês (M)', 'Partidas c/ Manutenção não paga'], rows);
}

export function anomalyTable(rs: GameResult[]): string {
  const tot: Record<string, number> = {};
  const games: Record<string, number> = {};
  for (const r of rs)
    for (const [k, v] of Object.entries(r.anomalies)) {
      tot[k] = (tot[k] ?? 0) + v;
      games[k] = (games[k] ?? 0) + 1;
    }
  const keys = Object.keys(tot);
  if (!keys.length) return '_Nenhuma anomalia (NaN, negativos ou estados impossíveis) em nenhuma partida._';
  return table(['Anomalia', 'Ocorrências (dias)', 'Partidas'], keys.map((k) => [k, tot[k], games[k]]));
}

export function dominance(rs: GameResult[]): string {
  // Para cada partida (preset, dif, semente), qual bot terminou com mais lucro?
  const key = (r: GameResult) => `${r.preset}|${r.difficulty}|${r.seed}`;
  const best = new Map<string, GameResult>();
  for (const r of rs) {
    const b = best.get(key(r));
    if (!b || r.finalProfit > b.finalProfit) best.set(key(r), r);
  }
  const count: Partial<Record<BotId, number>> = {};
  for (const r of best.values()) count[r.bot] = (count[r.bot] ?? 0) + 1;
  return table(['Bot', 'Maior lucro da semente'], BOT_IDS.map((b) => [BOT_LABEL[b], pct((count[b] ?? 0) / Math.max(1, best.size))]));
}

export interface RouteRun {
  item: string;
  qty: number;
  origin: string;
  dest: string;
  waitDays: number;
  out: number[];
}

export function routeTable(routes: RouteRun[]): string {
  const byWait = new Map<number, RouteRun[]>();
  for (const r of routes) byWait.set(r.waitDays, [...(byWait.get(r.waitDays) ?? []), r]);
  const rows = [...byWait].map(([w, rs]) => {
    const n = Math.max(...rs.map((r) => r.out.length));
    const rel = Array.from({ length: n }, (_, i) => {
      const xs = rs.filter((r) => r.out.length > i && r.out[0] > 0).map((r) => r.out[i] / r.out[0]);
      return xs.length ? pct(mean(xs)) : '—';
    });
    return [`${w} d`, rs.length, ...rel];
  });
  const n = Math.max(...rows.map((r) => r.length)) - 2;
  const examples = routes
    .filter((r) => r.waitDays === 0)
    .map((r) => `- ${r.qty}× ${r.item} ${r.origin}→${r.dest}: ${r.out.map((x) => Math.round(x / 1000)).join(', ')} mil US$`)
    .join('\n');
  const head = ['Espera entre viagens', 'Rotas', ...Array.from({ length: n }, (_, i) => `Viagem ${i + 1}`)];
  return `${table(head, rows)}\n\nLucro de cada viagem relativo à primeira (média das rotas). Exemplos sem espera:\n${examples}`;
}

export function buildReport(results: GameResult[], longResults: GameResult[], routes: RouteRun[], variant: string): string {
  const cal = calibration(results.concat(longResults).flatMap((r) => r.combats));
  const seeds = new Set(results.map((r) => r.seed)).size;
  const longDays = Math.max(0, ...longResults.map((r) => Math.round(r.days)));
  return [
    `# Resultado da simulação — ${variant}`,
    `Sementes por célula: ${seeds}. Partidas: ${results.length} na grade + ${longResults.length} longas (até ${longDays} dias). Gerado em ${new Date().toISOString()}.`,
    `## Vitória e lucro mediano (US$ M) por Preset × Dificuldade × Bot

Cada célula: \`taxa de vitória · lucro final mediano\`.

${winTable(results)}`,
    `## Resumo por bot

${botSummary(results)}`,
    `## Estratégia dominante (quem lucra mais em cada semente)

${dominance(results)}`,
    `## Primeira Estação

${stationTable(results)}`,
    `## Ameaças por bot

${threatTable(results)}`,
    `## Ameaças por Dificuldade (bots ativos)

${threatByDifficulty(results)}`,
    `## Manutenção vs renda

${upkeepTable(results)}`,
    `## Prévia × resultado real

${cal.md}

Viés médio (real − Prévia): ${(cal.bias * 100).toFixed(1)} pp · maior desvio entre faixas com ≥ 30 combates: ${(cal.maxGap * 100).toFixed(1)} pp · Brier ${cal.brier.toFixed(3)}.`,
    `## Tensão Global — grade

${tensionTable(results)}`,
    `## Tensão Global — partidas longas

${tensionTable(longResults, (r) => `${BOT_LABEL[r.bot]} · ${DIFFICULTY_LABEL[r.difficulty]}`)}`,
    routes.length ? `## Saturação: rota fixa repetida

${routeTable(routes)}` : '',
    `## Anomalias

${anomalyTable(results.concat(longResults))}`,
  ]
    .filter(Boolean)
    .join('\n\n') + '\n';
}
