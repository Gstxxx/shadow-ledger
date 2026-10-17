import { useId, type ComponentType } from 'react';
import { useLang } from '../../i18n';
import { itemName } from '../../i18n/lookup';
import { Backdrop, Defs, Finish, VH, VW, type Backdrop as BackdropKind, type Ink } from './kit';
import { Apc, Ifv, PatrolCar, SamLong, SamMobile, TankClassic, TankModern, Technical } from './vehicles';
import { Bomber, CargoJet, CargoProp, CargoStrategic, CargoWide, HeliAttack, HeliUtility, JetLight, JetMulti, JetStealth } from './aircraft';
import { Biological, Chemical, Intel, MachineGuns, Missiles, Nuclear, Rifles, Rockets, SpaceProgram, StateSecret, TechDocs, TechPackage } from './goods';
import { FIGURES, Person } from './people';

type Draw = ComponentType<{ ink: Ink }>;

/** Um desenho e um fundo por id do catálogo (src/game/data/items.ts). Trocar por foto depois = trocar a entrada. */
const SCENES: Record<string, { draw: Draw; bg: BackdropKind }> = {
  patrolcar: { draw: PatrolCar, bg: 'yard' },
  technical: { draw: Technical, bg: 'yard' },
  apc: { draw: Apc, bg: 'yard' },
  ifv: { draw: Ifv, bg: 'yard' },
  tank1: { draw: TankClassic, bg: 'yard' },
  tank3: { draw: TankModern, bg: 'yard' },
  sam1: { draw: SamMobile, bg: 'yard' },
  sam3: { draw: SamLong, bg: 'yard' },
  heli1: { draw: HeliUtility, bg: 'sky' },
  heli3: { draw: HeliAttack, bg: 'sky' },
  jet1: { draw: JetLight, bg: 'sky' },
  jet2: { draw: JetMulti, bg: 'sky' },
  jet3: { draw: JetStealth, bg: 'sky' },
  bomber: { draw: Bomber, bg: 'sky' },
  cargo0: { draw: CargoProp, bg: 'sky' },
  cargo1: { draw: CargoJet, bg: 'sky' },
  cargo2: { draw: CargoWide, bg: 'sky' },
  cargo3: { draw: CargoStrategic, bg: 'sky' },
  rifles: { draw: Rifles, bg: 'yard' },
  mg: { draw: MachineGuns, bg: 'yard' },
  rpg: { draw: Rockets, bg: 'yard' },
  atgm: { draw: Missiles, bg: 'yard' },
  intel: { draw: Intel, bg: 'desk' },
  docs: { draw: TechDocs, bg: 'desk' },
  secret: { draw: StateSecret, bg: 'desk' },
  tech: { draw: TechPackage, bg: 'studio' },
  space: { draw: SpaceProgram, bg: 'night' },
  chem: { draw: Chemical, bg: 'yard' },
  bio: { draw: Biological, bg: 'studio' },
  nuclear: { draw: Nuclear, bg: 'studio' },
};
for (const [id, fig] of Object.entries(FIGURES)) {
  const Draw: Draw = ({ ink }) => <Person ink={ink} fig={fig} />;
  SCENES[id] = { draw: Draw, bg: 'studio' };
}

export const ILLUSTRATED_IDS = Object.keys(SCENES);

export interface ItemIllustrationProps {
  id: string;
  /** sm = 96 px de largura (listas, sem grão nem desfoque); lg = 480 px (modal, com acabamento de foto). */
  size?: 'sm' | 'lg';
  className?: string;
  /** Texto alternativo; padrão: nome do item no idioma atual. Passe '' quando o nome já está ao lado. */
  alt?: string;
}

/** Ilustração "foto de arquivo" do item, 100% SVG por código. Id desconhecido → nada. */
export function ItemIllustration({ id, size = 'sm', className, alt }: ItemIllustrationProps) {
  const lang = useLang();
  const uid = useId().replace(/:/g, '');
  const scene = SCENES[id];
  if (!scene) return null;
  const lg = size === 'lg';
  const ink: Ink = { u: (n) => `url(#${uid}-${n})`, k: (n) => `${uid}-${n}`, lg };
  const label = alt ?? itemName(id, lang);
  const w = lg ? 480 : 96;
  const Draw = scene.draw;
  return (
    <svg
      className={`ii ii--${size}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${VW} ${VH}`}
      width={w}
      height={(w * VH) / VW}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-item={id}
    >
      <Defs ink={ink} />
      <Backdrop ink={ink} kind={scene.bg} />
      <Draw ink={ink} />
      <Finish ink={ink} />
    </svg>
  );
}
