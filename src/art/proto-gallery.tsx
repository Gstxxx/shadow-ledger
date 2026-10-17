import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  AnalystPortrait,
  ClassificationBar,
  CornerBrackets,
  Divider,
  DossierFrame,
  DirectorCard,
  DirectorPortrait,
  DIRECTOR_ORIGINS,
  DossierPaper,
  GameIcon,
  GROUP_LABEL,
  ICONS,
  Logo,
  Monogram,
  NoiseBackdrop,
  ORIGIN_INFO,
  OperativePortrait,
  RadarSweep,
  Redacted,
  RedactionBar,
  Stamp,
  Tape,
  WorldGlow,
  appIconDataUrl,
  palette,
  type AnalystMood,
  type IconAccent,
  type IconGroup,
} from './index';
import { GameKitShowcase, GameScreenMock, MenuMock } from './proto-gamekit';
import { GameKitPhase2 } from './proto-gamekit2';
import { SimpleDemo } from './proto-simple';

// ── utilidades da página ─────────────────────────────────────────────
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const css = `
.slg { min-height: 100vh; background: var(--sl-bg); color: var(--sl-text); font-family: var(--sl-font-body); font-size: var(--sl-fs-sm); line-height: var(--sl-lh-body); }
.slg * { box-sizing: border-box; }
.slg h2 { font-family: var(--sl-font-display); font-weight: 700; font-size: var(--sl-fs-2xl); letter-spacing: .06em; text-transform: uppercase; margin: 0; line-height: 1; }
.slg h3 { font-family: var(--sl-font-mono); font-weight: 600; font-size: var(--sl-fs-2xs); letter-spacing: var(--sl-tracking-label); text-transform: uppercase; color: var(--sl-text-muted); margin: var(--sl-space-6) 0 var(--sl-space-3); }
.slg-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: var(--sl-space-4); padding: 0 var(--sl-space-4); height: 44px; background: rgba(7,9,11,.86); backdrop-filter: blur(8px); border-bottom: 1px solid var(--sl-line); overflow-x: auto; }
.slg-nav a { font-family: var(--sl-font-mono); font-size: var(--sl-fs-2xs); letter-spacing: .14em; text-transform: uppercase; color: var(--sl-text-muted); text-decoration: none; white-space: nowrap; padding: 12px 2px; }
.slg-nav a:hover, .slg-nav a:focus-visible { color: var(--sl-warm); outline: none; }
.slg-sec { scroll-margin-top: 44px; padding: var(--sl-space-10) var(--sl-space-6); border-bottom: 1px solid var(--sl-line); max-width: 1400px; margin: 0 auto; }
.slg-sechead { display: flex; align-items: baseline; gap: var(--sl-space-4); margin-bottom: var(--sl-space-6); }
.slg-sechead span { font-family: var(--sl-font-mono); color: var(--sl-warm); font-size: var(--sl-fs-xs); letter-spacing: .2em; }
.slg-grid { display: grid; gap: var(--sl-space-3); grid-template-columns: repeat(auto-fill, minmax(var(--min, 160px), 1fr)); }
.slg-card { position: relative; background: var(--sl-surface); border: 1px solid var(--sl-line); padding: var(--sl-space-3); }
.slg-icon { display: grid; grid-template-columns: auto 1fr; gap: var(--sl-space-3); align-items: center; }
.slg-icon .big { grid-row: span 2; width: 96px; height: 96px; display: grid; place-items: center; background: radial-gradient(circle at 50% 40%, var(--sl-surface-raised), var(--sl-bg-deep)); border: 1px solid var(--sl-line); }
.slg-icon .smalls { display: flex; gap: var(--sl-space-3); align-items: center; color: var(--sl-text); }
.slg-icon .name { font-size: var(--sl-fs-xs); line-height: 1.25; }
.slg-icon code { font-family: var(--sl-font-mono); color: var(--sl-text-muted); font-size: var(--sl-fs-2xs); }
.slg-row { display: flex; flex-wrap: wrap; gap: var(--sl-space-6); align-items: flex-end; }
.slg-cap { font-family: var(--sl-font-mono); font-size: var(--sl-fs-2xs); color: var(--sl-text-muted); letter-spacing: .1em; text-transform: uppercase; margin-top: var(--sl-space-2); }
.slg-btn { min-height: 32px; padding: 0 var(--sl-space-3); background: var(--sl-surface-raised); color: var(--sl-text); border: 1px solid var(--sl-line-strong); font-family: var(--sl-font-mono); font-size: var(--sl-fs-2xs); letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
.slg-btn[aria-pressed="true"] { border-color: var(--sl-warm); color: var(--sl-warm); }
.slg-btn:focus-visible { outline: 2px solid var(--sl-focus); outline-offset: 2px; }
.slg-hero { position: relative; height: min(720px, 100vh); min-height: 316px; overflow: hidden; display: grid; grid-template-columns: 1.15fr 1fr; align-items: center; padding: 0 clamp(16px, 5vw, 72px); gap: 24px; }
@media (max-width: 760px) {
  .slg-sec { padding: var(--sl-space-6) var(--sl-space-4); }
  .slg-hero { grid-template-columns: 1.2fr 1fr; }
  .slg h2 { font-size: var(--sl-fs-xl); }
}
`;

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="slg-sec">
      <div className="slg-sechead">
        <span>{n}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SWATCHES: { name: string; hex: string; on?: string }[] = [
  { name: 'ink-950 · bg-deep', hex: palette.ink950 },
  { name: 'ink-900 · bg', hex: palette.ink900 },
  { name: 'ink-850 · surface', hex: palette.ink850 },
  { name: 'ink-800 · raised', hex: palette.ink800 },
  { name: 'ink-300 · text-muted', hex: palette.ink300 },
  { name: 'ink-100 · text', hex: palette.ink100 },
  { name: 'amber-400 · warm', hex: palette.amber400 },
  { name: 'signal-400 · signal', hex: palette.signal400 },
  { name: 'radar-300 · cold', hex: palette.radar300 },
  { name: 'ok-400 · ok', hex: palette.ok400 },
  { name: 'paper-100 · paper', hex: palette.paper100, on: palette.paper900 },
  { name: 'stamp-red', hex: palette.stampRed, on: palette.paper100 },
];

const GROUPS = Object.keys(GROUP_LABEL) as IconGroup[];
const MOODS: AnalystMood[] = ['neutral', 'concerned', 'alert', 'pleased'];
const MOOD_PT: Record<AnalystMood, string> = { neutral: 'neutra', concerned: 'preocupada', alert: 'alerta', pleased: 'satisfeita' };

export default function Gallery() {
  const [accent, setAccent] = useState<IconAccent>('warm');
  const [tension, setTension] = useState(0.35);
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [stampKey, setStampKey] = useState(0);

  const iconColor: CSSProperties = { color: 'var(--sl-text)' };

  return (
    <div className="slg">
      <style>{css}</style>
      <nav className="slg-nav" aria-label="Seções">
        <Logo variant="compact" height={22} />
        <a href="#tokens">Tokens</a>
        <a href="#logo">Logo</a>
        <a href="#icones">Ícones</a>
        <a href="#fundos">Fundos</a>
        <a href="#retratos">Retratos</a>
        <a href="#diretor">Diretor</a>
        <a href="#moldura">Moldura</a>
        <a href="#jogo">Jogo</a>
      </nav>

      {/* ── Composição de abertura ── */}
      <div className="slg-hero">
        <WorldGlow tension={tension} spots={[{ x: 0.78, y: 0.3, tone: 'signal', r: 0.06 }, { x: 0.2, y: 0.75, tone: 'warm', r: 0.05 }]} />
        <NoiseBackdrop fill={false} scanlines roll grain={0.09} vignette={0.9} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vh, 28px)' }}>
          <ClassificationBar level="secreto" caveat="Somente Diretoria" style={{ alignSelf: 'flex-start' }} />
          <Logo variant="full" height={64} style={{ fontSize: 0, maxWidth: '100%', transformOrigin: 'left center' }} className="slg-hero-logo" />
          <p style={{ margin: 0, maxWidth: 440, color: 'var(--sl-text-muted)', fontSize: 'var(--sl-fs-sm)' }}>
            Kit visual — tokens, ícones, fundos, retratos e moldura de dossiê. Tudo em SVG/CSS/Canvas, sem bitmaps.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: '100%' }}>
          <RadarSweep
            size="min(30vw, 62vh)"
            blips={[
              { x: 0.42, y: -0.3 },
              { x: -0.5, y: 0.2, tone: 'warm' },
              { x: 0.1, y: 0.62, tone: 'signal' },
            ]}
            style={{ position: 'absolute', opacity: 0.85 }}
          />
          <div style={{ position: 'relative', transform: 'translate(22%, 10%)' }}>
            <DossierFrame surface="glass" padding={0} tone="cold" style={{ width: 'min(17vw, 36vh)', minWidth: 96 }}>
              <AnalystPortrait mood="neutral" size={240} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </DossierFrame>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 760px){ .slg-hero-logo { transform: scale(.62); margin: -14px 0; } }`}</style>

      {/* ── Tokens ── */}
      <Section id="tokens" n="01" title="Tokens">
        <h3>Paleta · contraste sobre o fundo (AA ≥ 4.5)</h3>
        <div className="slg-grid" style={{ ['--min' as string]: '150px' }}>
          {SWATCHES.map((s) => {
            const ratio = s.on ? contrast(s.hex, s.on) : contrast(s.hex, palette.ink900);
            const fg = lum(s.hex) > 0.25 ? palette.ink950 : palette.ink100;
            return (
              <div key={s.name} className="slg-card" style={{ padding: 0 }}>
                <div style={{ height: 64, background: s.hex, display: 'flex', alignItems: 'flex-end', padding: 8, color: s.on ?? fg, fontFamily: 'var(--sl-font-display)', fontWeight: 700, fontSize: 20 }}>
                  Aa
                </div>
                <div style={{ padding: 8 }}>
                  <div style={{ fontSize: 'var(--sl-fs-xs)' }}>{s.name}</div>
                  <code style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 11, color: 'var(--sl-text-muted)' }}>
                    {s.hex} · {ratio.toFixed(1)}:1{s.on ? ' (texto)' : ''}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
        <h3>Tipografia</h3>
        <div style={{ display: 'grid', gap: 'var(--sl-space-4)' }}>
          <div className="sl-display" style={{ fontSize: 'var(--sl-fs-4xl)' }}>Crise Final em 72h</div>
          <div className="sl-display" style={{ fontSize: 'var(--sl-fs-2xl)', color: 'var(--sl-warm)' }}>Estação Lagos · Escritório</div>
          <div style={{ fontFamily: 'var(--sl-font-body)', fontSize: 'var(--sl-fs-md)', maxWidth: 640 }}>
            IBM Plex Sans para texto corrido: a Exposição na Nigéria subiu depois da venda de lança-foguetes. Uma Ameaça jurídica foi anunciada para daqui a três dias.
          </div>
          <div style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 'var(--sl-fs-sm)', color: 'var(--sl-cold)' }}>JetBrains Mono · $ 12.400.000 · 04:17:32 · LAT −6.45 LON 3.39</div>
          <div style={{ fontFamily: 'var(--sl-font-type)', fontSize: 'var(--sl-fs-lg)' }}>Special Elite — anotações de dossiê e codinomes.</div>
        </div>
      </Section>

      {/* ── Logo ── */}
      <Section id="logo" n="02" title="Logo">
        <div className="slg-row">
          <div>
            <Logo variant="full" height={72} />
            <div className="slg-cap">full</div>
          </div>
          <div>
            <Logo variant="horizontal" height={44} />
            <div className="slg-cap">horizontal</div>
          </div>
          <div>
            <Logo variant="compact" height={28} />
            <div className="slg-cap">compact (HUD)</div>
          </div>
          <div>
            <Monogram size={80} />
            <div className="slg-cap">mark</div>
          </div>
        </div>
        <h3>Ícone de app (string SVG → manifest PWA)</h3>
        <div className="slg-row">
          {[
            { s: 512, m: false, w: 160 },
            { s: 192, m: false, w: 96 },
            { s: 512, m: true, w: 160 },
            { s: 192, m: false, w: 48 },
            { s: 192, m: false, w: 32 },
          ].map((o, i) => (
            <div key={i}>
              <img src={appIconDataUrl(o.s, { maskable: o.m })} width={o.w} height={o.w} alt="" style={{ display: 'block', borderRadius: o.m ? '50%' : 0 }} />
              <div className="slg-cap">
                {o.s}
                {o.m ? ' maskable' : ''} @{o.w}px
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Ícones ── */}
      <Section id="icones" n="03" title="Ícones">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="slg-cap" style={{ margin: 0 }}>acento</span>
          {(['warm', 'cold', 'signal', 'none'] as IconAccent[]).map((a) => (
            <button key={a} className="slg-btn" aria-pressed={accent === a} onClick={() => setAccent(a)}>
              {a}
            </button>
          ))}
          <span className="slg-cap" style={{ margin: 0 }}>· {Object.keys(ICONS).length} ícones · 96 / 32 / 20 px</span>
        </div>
        {GROUPS.map((g) => (
          <div key={g}>
            <h3>{GROUP_LABEL[g]}</h3>
            <div className="slg-grid" style={{ ['--min' as string]: '232px' }}>
              {Object.entries(ICONS)
                .filter(([, d]) => d.group === g)
                .map(([id, d]) => (
                  <div key={id} className="slg-card slg-icon">
                    <div className="big" style={iconColor}>
                      <GameIcon id={id} size={72} accent={accent} />
                    </div>
                    <div className="smalls">
                      <GameIcon id={id} size={32} accent={accent} />
                      <GameIcon id={id} size={20} accent={accent} />
                      <span style={{ color: 'var(--sl-text-muted)' }}>
                        <GameIcon id={id} size={20} accent="none" />
                      </span>
                    </div>
                    <div>
                      <div className="name">{d.label}</div>
                      <code>{id}</code>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        <h3>Em contexto · barra de HUD a 20px</h3>
        <div className="slg-card" style={{ display: 'flex', gap: 'var(--sl-space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            ['money', '$ 12,4 M', 'warm'],
            ['tension', '62%', 'signal'],
            ['exposure', 'Alta', 'signal'],
            ['reputation', 'Aliado', 'ok'],
            ['station-office', '4', 'cold'],
            ['team', '3', 'cold'],
            ['contract', '2', 'warm'],
            ['clock', '12d', 'cold'],
          ].map(([id, v, a]) => (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sl-font-mono)', fontSize: 'var(--sl-fs-sm)' }}>
              <GameIcon id={id} size={20} accent={a as IconAccent} title={ICONS[id].label} />
              {v}
            </span>
          ))}
        </div>
      </Section>

      {/* ── Fundos ── */}
      <Section id="fundos" n="04" title="Fundos">
        <div className="slg-grid" style={{ ['--min' as string]: '280px' }}>
          <div>
            <div style={{ position: 'relative', height: 200, border: '1px solid var(--sl-line)' }}>
              <NoiseBackdrop grain={0.1} tint="warm" />
            </div>
            <div className="slg-cap">NoiseBackdrop · grão + vinheta · tint warm</div>
          </div>
          <div>
            <div style={{ position: 'relative', height: 200, border: '1px solid var(--sl-line)' }}>
              <NoiseBackdrop grain={0.1} scanlines roll tint="cold" />
            </div>
            <div className="slg-cap">NoiseBackdrop · scanlines + roll · tint cold</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RadarSweep size={200} blips={[{ x: 0.3, y: -0.5 }, { x: -0.6, y: 0.1, tone: 'warm' }, { x: 0.5, y: 0.5, tone: 'signal' }]} />
            <div className="slg-cap">RadarSweep · contatos sincronizados ao feixe</div>
          </div>
        </div>
        <h3>WorldGlow · Tensão Global {Math.round(tension * 100)}%</h3>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={tension}
          onChange={(e) => setTension(Number(e.target.value))}
          aria-label="Tensão Global"
          style={{ width: 'min(100%, 360px)', accentColor: 'var(--sl-warm)', minHeight: 32 }}
        />
        <div style={{ position: 'relative', height: 260, border: '1px solid var(--sl-line)', marginTop: 8 }}>
          <WorldGlow tension={tension} spots={[{ x: 0.56, y: 0.42, tone: 'signal' }, { x: 0.3, y: 0.6, tone: 'warm', r: 0.05 }, { x: 0.8, y: 0.3, tone: 'cold', r: 0.04 }]} />
        </div>
        <h3>DossierPaper · fibra, manchas, borda queimada</h3>
        <div className="slg-grid" style={{ ['--min' as string]: '300px', gap: 'var(--sl-space-8)' }}>
          <DossierPaper burn={0.45} stain fold tilt={-1.2} seed={3}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 11, letterSpacing: '.2em', color: 'var(--sl-paper-ink-muted)' }}>RELATÓRIO 0417 · LAGOS</div>
                <div style={{ fontFamily: 'var(--sl-font-display)', fontWeight: 700, fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>Ameaça Jurídica</div>
              </div>
              <Stamp text="CONFIDENCIAL" size={18} rotate={6} />
            </div>
            <p style={{ fontFamily: 'var(--sl-font-type)', fontSize: 15, lineHeight: 1.6, margin: '14px 0 0' }}>
              Auditoria federal marcada para o dia 14. O promotor <Redacted>Adeyemi Okafor</Redacted> recebeu documentos da <Redacted>Agência Rival Halcyon</Redacted>. Recomenda-se
              Tática Negociar.
            </p>
            <div style={{ display: 'grid', gap: 4, marginTop: 10 }}>
              <RedactionBar width="82%" seed={2} />
              <RedactionBar width="60%" seed={5} />
            </div>
          </DossierPaper>
          <DossierPaper burn={0} seed={8} tilt={0.8}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <OperativePortrait seed="okafor" size={96} tone="paper" code="OP-0091" />
              <div style={{ fontFamily: 'var(--sl-font-type)', fontSize: 15, lineHeight: 1.6 }}>
                Codinome: <b>Cormorant</b>
                <br />
                Função: Agente de Campo
                <br />
                Situação: <Redacted revealed={revealed}>Detida em Abuja</Redacted>
              </div>
            </div>
            <button className="slg-btn" style={{ marginTop: 12, background: 'transparent', color: 'var(--sl-paper-ink)', borderColor: 'var(--sl-paper-ink-muted)' }} onClick={() => setRevealed((r) => !r)}>
              {revealed ? 'Censurar' : 'Revelar'}
            </button>
          </DossierPaper>
          <DossierPaper burn={0.2} lite tilt={-0.5}>
            <div style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 11, letterSpacing: '.2em', color: 'var(--sl-paper-ink-muted)' }}>MODO LITE (CELULAR FRACO)</div>
            <p style={{ fontFamily: 'var(--sl-font-type)', fontSize: 15, margin: '8px 0 0' }}>Sem filtros SVG: só gradientes. Ativado sozinho com Save-Data, pouca memória ou poucos núcleos.</p>
          </DossierPaper>
        </div>
      </Section>

      {/* ── Retratos ── */}
      <Section id="retratos" n="05" title="Retratos">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Analista · 4 expressões</h3>
          <button className="slg-btn" aria-pressed={speaking} onClick={() => setSpeaking((s) => !s)}>
            falando
          </button>
        </div>
        <div className="slg-row" style={{ marginTop: 12 }}>
          {MOODS.map((m) => (
            <div key={m}>
              <div style={{ position: 'relative' }}>
                <AnalystPortrait mood={m} size={180} speaking={speaking} />
                <CornerBrackets tone="cold" />
              </div>
              <div className="slg-cap">{MOOD_PT[m]}</div>
            </div>
          ))}
          <div>
            <AnalystPortrait mood="neutral" size={64} />
            <div className="slg-cap">64px (toast)</div>
          </div>
        </div>
        <h3>Operativos · DiceBear + ficha duotone</h3>
        <div className="slg-row">
          {[
            { seed: 'raven-07', tone: 'cold' as const, name: 'Raven' },
            { seed: 'mbeki', tone: 'warm' as const, name: 'Mbeki' },
            { seed: 'sokolova', tone: 'paper' as const, code: 'LAW-0332' },
            { seed: 'ito-kenji', tone: 'cold' as const, status: 'DETIDO' },
            { seed: 'alvarez', tone: 'signal' as const, name: 'Álvarez', status: 'FERIDA' },
            { seed: 'nadia', tone: 'warm' as const },
          ].map((o) => (
            <OperativePortrait key={o.seed} size={128} {...o} />
          ))}
        </div>
        <h3>Sem moldura (listas, 48px)</h3>
        <div className="slg-row" style={{ gap: 8 }}>
          {['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'].map((s, i) => (
            <OperativePortrait key={s} seed={s} size={48} frame={false} tone={(['cold', 'warm', 'paper'] as const)[i % 3]} />
          ))}
        </div>
      </Section>

      {/* ── Diretor ── */}
      <Section id="diretor" n="05b" title="Diretor · Origens">
        <h3>Cartões de seleção (320px)</h3>
        <div className="slg-row" style={{ gap: 16, alignItems: 'flex-start' }}>
          {DIRECTOR_ORIGINS.map((o, i) => (
            <DirectorCard key={o} origin={o} width={300} selected={i === 0} />
          ))}
        </div>
        <h3>Expressões</h3>
        <div className="slg-row" style={{ gap: 10 }}>
          {MOODS.map((m) => (
            <div key={m}>
              <DirectorPortrait origin="colonel" mood={m} size={120} />
              <div className="slg-cap">{MOOD_PT[m]}</div>
            </div>
          ))}
          {MOODS.map((m) => (
            <div key={'d' + m}>
              <DirectorPortrait origin="smuggler" mood={m} size={120} />
              <div className="slg-cap">{MOOD_PT[m]}</div>
            </div>
          ))}
        </div>
        <h3>Ícone de topo (48px) e emblemas de Vantagem/Desvantagem</h3>
        <div className="slg-row" style={{ gap: 20 }}>
          {DIRECTOR_ORIGINS.map((o) => (
            <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ border: '1px solid var(--sl-line-strong)', lineHeight: 0 }}>
                <DirectorPortrait origin={o} size={48} />
              </span>
              <GameIcon id={ORIGIN_INFO[o].emblem} size={32} />
              <GameIcon id={ORIGIN_INFO[o].emblem} size={20} />
              <span style={{ fontSize: 12, maxWidth: 90, lineHeight: 1.2 }}>{ORIGIN_INFO[o].label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Moldura ── */}
      <Section id="moldura" n="06" title="Moldura de UI">
        <div className="slg-grid" style={{ ['--min' as string]: '300px', gap: 'var(--sl-space-6)' }}>
          <DossierFrame label="Estação" code="EST-04 · LAGOS">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <GameIcon id="station-office" size={40} accent="cold" />
              <div>
                <div className="sl-display" style={{ fontSize: 24 }}>Escritório</div>
                <div style={{ color: 'var(--sl-text-muted)', fontSize: 12 }}>Renda $ 84k/mês · Cofre 12/40 t</div>
              </div>
            </div>
          </DossierFrame>
          <DossierFrame label="Ameaça" code="T-3d 04h" tone="signal" surface="glass">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <GameIcon id="threat" size={40} accent="signal" />
              <div style={{ fontSize: 13 }}>Batida policial anunciada. Prévia: 62% de vitória com Tática Defensiva.</div>
            </div>
          </DossierFrame>
          <DossierFrame label="Contrato" code="C-112" tone="warm">
            <Divider label="Prazo 9 dias" tone="warm" />
            <div style={{ marginTop: 10, fontSize: 13 }}>
              40× Fuzis de Assalto para <Redacted>Ministério da Defesa</Redacted> · prêmio +38%
            </div>
          </DossierFrame>
        </div>
        <h3>Carimbos</h3>
        <div className="slg-row" key={stampKey} style={{ alignItems: 'center', background: 'var(--sl-paper)', padding: 24, gap: 28 }}>
          <Stamp text="CONFIDENCIAL" animate />
          <Stamp text="INTERDITADA" sub="ORDEM 2231 · 14 MAR" rotate={4} animate />
          <Stamp text="DETIDO" rotate={-12} size={36} animate wear={0.7} />
          <Stamp text="APROVADO" rotate={-3} size={22} animate />
          <Stamp text="URGENTE" color="signal" rotate={7} size={22} />
        </div>
        <div className="slg-row" style={{ alignItems: 'center', marginTop: 12, gap: 28 }}>
          <Stamp text="CONFIDENCIAL" color="amber" size={20} />
          <Stamp text="SEQUESTRADO" color="signal" size={20} rotate={3} />
          <Stamp text="ARQUIVADO" color="cold" size={20} rotate={-5} />
          <button className="slg-btn" onClick={() => setStampKey((k) => k + 1)}>
            carimbar de novo
          </button>
        </div>
        <h3>Divisores, faixas e fita</h3>
        <div style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
          <Divider label="Fim do relatório" />
          <Divider variant="ticks" />
          <Divider variant="perforation" />
          <Divider variant="hazard" tone="warm" />
          <ClassificationBar level="restrito" caveat="Distribuição limitada" />
          <ClassificationBar level="secreto" />
          <ClassificationBar level="ultrassecreto" caveat="Olhos do Diretor" />
          <div style={{ position: 'relative', paddingTop: 10 }}>
            <Tape style={{ position: 'absolute', top: 0, left: 24, zIndex: 1 }} />
            <Tape rotate={6} width={56} style={{ position: 'absolute', top: 2, right: 24, zIndex: 1 }} />
            <DossierPaper burn={0.1} padding={20}>
              <span style={{ fontFamily: 'var(--sl-font-type)' }}>Recorte preso com fita.</span>
            </DossierPaper>
          </div>
        </div>
      </Section>
      {/* ── Jogo ── */}
      <Section id="jogo" n="07" title="Componentes de jogo">
        <h3>Botões, segmentado, etiquetas, barras</h3>
        <GameKitShowcase />
        <h3>Fase 2: HUD, fichas, cartas, modais, teletipo, controles, mapa, tabuleiro, telex</h3>
        <GameKitPhase2 />
        <h3>Fase 3: telas simples (veredito, número grande, detalhes, alavanca de modo)</h3>
        <SimpleDemo screen="kit" />
        <h3>Menu principal</h3>
        <MenuMock />
        <h3>Tela de jogo recriada com .g-*</h3>
        <div style={{ overflowX: 'auto' }}>
          <GameScreenMock />
        </div>
      </Section>
    </div>
  );
}
