import type { Continent } from '../types';

export interface CountrySeed {
  id: string; // ISO numeric, matches world-atlas feature id
  name: string;
  continent: Continent;
  level: number;
  lon: number;
  lat: number;
}

// Capital coordinates; level = economic/military weight 1..5
export const COUNTRY_SEEDS: CountrySeed[] = [
  { id: '840', name: 'Estados Unidos', continent: 'NA', level: 5, lon: -77.0, lat: 38.9 },
  { id: '124', name: 'Canadá', continent: 'NA', level: 4, lon: -75.7, lat: 45.4 },
  { id: '484', name: 'México', continent: 'NA', level: 3, lon: -99.1, lat: 19.4 },
  { id: '192', name: 'Cuba', continent: 'NA', level: 2, lon: -82.4, lat: 23.1 },
  { id: '591', name: 'Panamá', continent: 'NA', level: 2, lon: -79.5, lat: 9.0 },

  { id: '076', name: 'Brasil', continent: 'SA', level: 4, lon: -47.9, lat: -15.8 },
  { id: '032', name: 'Argentina', continent: 'SA', level: 3, lon: -58.4, lat: -34.6 },
  { id: '152', name: 'Chile', continent: 'SA', level: 3, lon: -70.6, lat: -33.4 },
  { id: '170', name: 'Colômbia', continent: 'SA', level: 2, lon: -74.1, lat: 4.7 },
  { id: '862', name: 'Venezuela', continent: 'SA', level: 2, lon: -66.9, lat: 10.5 },
  { id: '604', name: 'Peru', continent: 'SA', level: 2, lon: -77.0, lat: -12.0 },

  { id: '826', name: 'Reino Unido', continent: 'EU', level: 5, lon: -0.1, lat: 51.5 },
  { id: '250', name: 'França', continent: 'EU', level: 5, lon: 2.35, lat: 48.85 },
  { id: '276', name: 'Alemanha', continent: 'EU', level: 5, lon: 13.4, lat: 52.5 },
  { id: '756', name: 'Suíça', continent: 'EU', level: 5, lon: 7.45, lat: 46.95 },
  { id: '380', name: 'Itália', continent: 'EU', level: 4, lon: 12.5, lat: 41.9 },
  { id: '724', name: 'Espanha', continent: 'EU', level: 4, lon: -3.7, lat: 40.4 },
  { id: '752', name: 'Suécia', continent: 'EU', level: 4, lon: 18.1, lat: 59.3 },
  { id: '616', name: 'Polônia', continent: 'EU', level: 3, lon: 21.0, lat: 52.2 },
  { id: '804', name: 'Ucrânia', continent: 'EU', level: 3, lon: 30.5, lat: 50.45 },
  { id: '643', name: 'Rússia', continent: 'EU', level: 5, lon: 37.6, lat: 55.75 },
  { id: '792', name: 'Turquia', continent: 'EU', level: 3, lon: 32.85, lat: 39.9 },
  { id: '300', name: 'Grécia', continent: 'EU', level: 3, lon: 23.7, lat: 38.0 },
  { id: '688', name: 'Sérvia', continent: 'EU', level: 2, lon: 20.45, lat: 44.8 },

  { id: '376', name: 'Israel', continent: 'ME', level: 4, lon: 35.2, lat: 31.8 },
  { id: '682', name: 'Arábia Saudita', continent: 'ME', level: 4, lon: 46.7, lat: 24.7 },
  { id: '784', name: 'Emirados Árabes', continent: 'ME', level: 4, lon: 54.4, lat: 24.45 },
  { id: '364', name: 'Irã', continent: 'ME', level: 3, lon: 51.4, lat: 35.7 },
  { id: '818', name: 'Egito', continent: 'ME', level: 3, lon: 31.2, lat: 30.0 },
  { id: '368', name: 'Iraque', continent: 'ME', level: 2, lon: 44.4, lat: 33.3 },
  { id: '760', name: 'Síria', continent: 'ME', level: 1, lon: 36.3, lat: 33.5 },
  { id: '887', name: 'Iêmen', continent: 'ME', level: 1, lon: 44.2, lat: 15.35 },
  { id: '004', name: 'Afeganistão', continent: 'ME', level: 1, lon: 69.2, lat: 34.5 },

  { id: '710', name: 'África do Sul', continent: 'AF', level: 3, lon: 28.2, lat: -25.75 },
  { id: '566', name: 'Nigéria', continent: 'AF', level: 2, lon: 7.5, lat: 9.05 },
  { id: '404', name: 'Quênia', continent: 'AF', level: 2, lon: 36.8, lat: -1.3 },
  { id: '434', name: 'Líbia', continent: 'AF', level: 2, lon: 13.2, lat: 32.9 },
  { id: '024', name: 'Angola', continent: 'AF', level: 2, lon: 13.25, lat: -8.8 },
  { id: '504', name: 'Marrocos', continent: 'AF', level: 2, lon: -6.85, lat: 34.0 },
  { id: '180', name: 'Congo (RDC)', continent: 'AF', level: 1, lon: 15.3, lat: -4.3 },
  { id: '231', name: 'Etiópia', continent: 'AF', level: 1, lon: 38.75, lat: 9.0 },
  { id: '466', name: 'Mali', continent: 'AF', level: 1, lon: -8.0, lat: 12.65 },

  { id: '156', name: 'China', continent: 'AS', level: 5, lon: 116.4, lat: 39.9 },
  { id: '392', name: 'Japão', continent: 'AS', level: 5, lon: 139.7, lat: 35.7 },
  { id: '410', name: 'Coreia do Sul', continent: 'AS', level: 4, lon: 127.0, lat: 37.55 },
  { id: '356', name: 'Índia', continent: 'AS', level: 4, lon: 77.2, lat: 28.6 },
  { id: '408', name: 'Coreia do Norte', continent: 'AS', level: 2, lon: 125.75, lat: 39.0 },
  { id: '586', name: 'Paquistão', continent: 'AS', level: 3, lon: 73.0, lat: 33.7 },
  { id: '764', name: 'Tailândia', continent: 'AS', level: 3, lon: 100.5, lat: 13.75 },
  { id: '360', name: 'Indonésia', continent: 'AS', level: 3, lon: 106.85, lat: -6.2 },
  { id: '704', name: 'Vietnã', continent: 'AS', level: 2, lon: 105.85, lat: 21.0 },
  { id: '608', name: 'Filipinas', continent: 'AS', level: 2, lon: 121.0, lat: 14.6 },
  { id: '398', name: 'Cazaquistão', continent: 'AS', level: 2, lon: 71.45, lat: 51.15 },

  { id: '036', name: 'Austrália', continent: 'OC', level: 4, lon: 149.1, lat: -35.3 },
  { id: '554', name: 'Nova Zelândia', continent: 'OC', level: 3, lon: 174.8, lat: -41.3 },
];

export const CONTINENT_LABEL: Record<Continent, string> = {
  NA: 'América do Norte',
  SA: 'América do Sul',
  EU: 'Europa',
  AF: 'África',
  ME: 'Oriente Médio',
  AS: 'Ásia',
  OC: 'Oceania',
};

/** Great-circle distance in km. */
export function distanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The n nearest countries to `id` — used as "neighbors" for intel radius and group movement. */
export function neighbors(id: string, n = 4, pool: CountrySeed[] = COUNTRY_SEEDS): string[] {
  const me = pool.find((c) => c.id === id);
  if (!me) return [];
  return pool
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, d: distanceKm(me, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.id);
}
