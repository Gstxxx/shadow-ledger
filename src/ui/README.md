# Contrato da interface

Como as telas (inclusive o menu em `src/ui/menu`, de outra sessão) falam com o jogo. A lógica fica em
`src/game/` (sem React); a interface só lê o estado e chama ações.

## Estado e partida — `src/store/game.ts`

```ts
import { useGameStore, useGame, usePlayer, hasSave, exportSave, importSave, deleteSave } from '../store/game';

useGameStore.getState().start(opts: GameOptions)   // Nova Partida a partir de um Preset ou Sandbox
useGameStore.getState().continueSaved(): boolean   // Continuar o save local
useGameStore.getState().quit()                     // salva e volta ao menu
useGameStore.getState().go(screen)                 // 'title' | 'newgame' | 'settings' | 'credits' | 'game'
hasSave(); exportSave(): string | null; importSave(json): boolean; deleteSave()
```

`GameOptions` (`src/game/types.ts`): `{ preset: PresetDef; difficulty: 1|2|3; hardcore: boolean;
directorName?; agencyName?; rivals?: number; seed? }`. Um Sandbox personalizado é um `PresetDef` montado pelo
menu (id próprio, `objective`, `days`, `target?`, `cash`, `startCountry`, `startStations`, `startUnits`,
`challenge`, `region?`). Os Presets prontos estão em `PRESETS` (`src/game/data/rules.ts`).

Dentro da partida, componentes usam `useGame()` (re-renderiza a cada mudança) e
`act((s, agency) => action(s, agency, ...), sfx?)` para chamar ações de `src/game/actions.ts`; o retorno
`{ ok, msg }` vira aviso na tela.

## Save — `src/game/save.ts`

JSON puro com `saveVersion` (hoje 4) e migrações em `MIGRATIONS`. Sempre carregue com `loadSave(json)`.
O RNG (`seed`, `rng`) faz parte do save. `savedAt` (ms) é gravado a cada autosave.

## Configurações — `src/store/settings.ts`

`useSettings()` com `music`, `sfx` (0..1), `defaultSpeed` (1|2|4), `reducedMotion` e setters
(`setMusic`, `setSfx`, `setDefaultSpeed`, `setReducedMotion`), persistidos em localStorage. Os setters de
volume já aplicam no áudio. Idioma e silenciar a Analista ainda não existem (ver i18n abaixo).

## Áudio — `src/audio/engine.ts`

`audio.unlock()` no primeiro gesto; `audio.setScene('menu' | 'map' | 'combat' | 'off')`;
`audio.setMusicVolume(v)`, `audio.setSfxVolume(v)`, `audio.setTension(0..1)`, `audio.sfx(nome)`.
O `App.tsx` troca a cena sozinho: menu fora da partida, mapa ou combate dentro dela.

## Plataforma — `src/platform/`

`entitlements()` (o que o jogador possui; tudo liberado na web) e `rewardedAds()` (nulo na web). Ver ADR 0004.

## Ainda não existe

- **i18n**: todo texto ainda está em pt-BR no código. A estrutura `src/i18n` (chaves, `t(key)`, `useLang()`)
  será criada antes do lançamento; quando existir, este arquivo descreve a API.
- **Preset de Tutorial** e **Analista**.
