import { useEffect, useRef, useState } from 'react';
import { succeeded } from '../../game/combat';
import { player } from '../../game/state';
import type { CombatState, GameState } from '../../game/types';
import { useGameStore } from '../../store/game';
import { useLang, translate, type Key } from '../../i18n';
import { countryName } from '../../i18n/lookup';
import { SceneCinematic, type SceneRequest } from './SceneCinematic';

/** A mesma cena não toca duas vezes seguidas dentro desta janela. */
const SAME_SCENE_GAP_MS = 120_000;
let lastPlayed: { kind: SceneRequest['kind']; at: number } | null = null;

const DEBUG: Record<string, SceneRequest> = {
  'raid-held': { kind: 'raid', country: '484', threat: '', outcome: 'held' },
  'raid-lost': { kind: 'raid', country: '484', threat: '', outcome: 'lost' },
  'raid-interdicted': { kind: 'raid', country: '484', threat: '', outcome: 'interdicted' },
  hunt: { kind: 'hunt', country: '434', band: 'Brigada do Deserto', bounty: 1_200_000 },
  crisis: { kind: 'crisis' },
};

/**
 * Observa o jogo e toca a cena curta certa quando algo grande acontece (só para a agência do jogador):
 * - Ataque à Estação: um Combate de Ameaça contra a Estação termina (mantida, rebaixada ou Interditada);
 * - Caçada concluída: um Combate de Caçada termina vencido;
 * - Crise Final: o jogo termina pela Crise Final.
 * Pausa o relógio do jogo enquanto a cena toca. `?cine=raid-held|raid-lost|raid-interdicted|hunt|crisis` força uma cena.
 */
export function CinematicHost() {
  const lang = useLang();
  const [queue, setQueue] = useState<SceneRequest[]>(() => {
    const d = new URLSearchParams(location.search).get('cine');
    return d && DEBUG[d] ? [DEBUG[d]] : [];
  });
  const prev = useRef<{ combat?: CombatState; over: boolean; bands: Map<string, { name: string; bounty: number; countryId: string }> }>({ over: false, bands: new Map() });

  useEffect(() => {
    const snap = (g: GameState) => {
      prev.current = {
        combat: g.combat,
        over: !!g.over,
        bands: new Map((g.hostiles ?? []).map((b) => [b.id, { name: b.name, bounty: b.bounty, countryId: b.countryId }])),
      };
    };
    const g0 = useGameStore.getState().game;
    if (g0) snap(g0);
    return useGameStore.subscribe((st) => {
      const g = st.game;
      if (!g) return;
      const p = prev.current;
      const found: SceneRequest[] = [];
      const c = p.combat;
      if (c && g.combat !== c && c.result && c.agencyId === player(g).id) {
        const r = c.reason;
        const won = succeeded(c);
        if (r.kind === 'threat' && r.target === 'station') {
          found.push({
            kind: 'raid',
            country: r.countryId,
            threat: translate(lang, `threat.${r.threatKind}` as Key),
            outcome: won ? 'held' : r.threatKind === 'raid' || r.threatKind === 'lawsuit' ? 'interdicted' : 'lost',
          });
        } else if (r.kind === 'hunt' && won) {
          const b = p.bands.get(r.bandId);
          found.push({ kind: 'hunt', country: r.countryId, band: b?.name ?? '', bounty: b?.bounty ?? 0 });
        }
      }
      if (!p.over && g.over && g.over.reasonMsg?.key === 'msg.crisis.reason') found.push({ kind: 'crisis' });
      snap(g);
      // A mesma cena não toca duas vezes seguidas dentro da janela.
      const now = Date.now();
      const ok = found.filter((x) => {
        if (lastPlayed && lastPlayed.kind === x.kind && now - lastPlayed.at < SAME_SCENE_GAP_MS) return false;
        lastPlayed = { kind: x.kind, at: now };
        return true;
      });
      if (ok.length) setQueue((q) => [...q, ...ok]);
    });
  }, [lang]);

  const cur = queue[0];
  // Relógio do jogo parado enquanto a cena toca.
  useEffect(() => {
    if (!cur) return;
    const wasPaused = useGameStore.getState().paused;
    useGameStore.setState({ paused: true });
    return () => {
      if (!wasPaused) useGameStore.setState({ paused: false });
    };
  }, [cur]);

  if (!cur) return null;
  const req: SceneRequest = cur.kind === 'crisis' ? cur : { ...cur, country: countryName(cur.country, lang) };
  return <SceneCinematic key={queue.length + cur.kind} req={req} onDone={() => setQueue((q) => q.slice(1))} />;
}
