// Campanha "Herança": cada Capítulo jogado pelos bots a partir de startChapter (mesmo caminho da UI).
// Cenários: sem bônus de caixa (primeira tentativa ou Lucro negativo) e com o bônus no teto de 25%
// do caixa base (o caso típico de quem lucrou bem). Sem Veteranos (limite inferior).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it as vitestIt } from 'vitest';
import { chapterDef } from '../../src/game/campaign/chapters';
import { newCampaign, startChapter } from '../../src/game/campaign/flow';
import type { Difficulty } from '../../src/game/types';
import type { BotId } from './bots';
import { runGame } from './harness';
import type { GameResult } from './harness';
import { OUT, SEEDS } from './runner';

const it = vitestIt.skipIf(!process.env.BALANCE);
const BOTS: BotId[] = ['iniciante', 'guloso', 'operador', 'passivo'];
/** Bônus no teto decidido (25% do caixa base), independente do valor atual de CAMPAIGN.cashBonusCap. */
const BONUS_CAP = 0.25;

export function campaignFile(chapters: number[]) {
  it(`Campanha, Capítulos ${chapters.join(', ')}`, () => {
    const out: GameResult[] = [];
    for (const n of chapters) {
      const ch = chapterDef(n);
      for (const bonus of [false, true])
        for (const d of [1, 2, 3] as Difficulty[])
          for (const bot of BOTS)
            for (let i = 0; i < SEEDS; i++) {
              const seed = 2000 + i * 41;
              const r = runGame({
                preset: ch.preset,
                difficulty: d,
                bot,
                seed,
                make: () => {
                  const c = { ...newCampaign({ difficulty: d, hardcore: false, origin: 'none', seed }), chapter: n };
                  const s = startChapter(c);
                  if (bonus) {
                    // Aplica o bônus no teto decidido, e o Lucro do Capítulo começa nele.
                    const a = s.agencies[0];
                    a.cash += Math.round(ch.preset.cash * BONUS_CAP);
                    a.capital += Math.round(ch.preset.cash * BONUS_CAP);
                  }
                  return s;
                },
              });
              r.preset = `${ch.preset.id}${bonus ? '+bonus' : ''}`;
              out.push({ ...r, profitByDay: [], tensionByDay: [] });
            }
    }
    mkdirSync(join(OUT, 'parts'), { recursive: true });
    writeFileSync(join(OUT, 'parts', `campaign-${chapters.join('-')}.json`), JSON.stringify(out));
    expect(out.length).toBeGreaterThan(0);
  });
}
