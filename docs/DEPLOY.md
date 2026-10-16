# Deploy do Shadow Ledger

Sem servidor próprio: o jogo é estático (Vite) e os saves ficam no navegador do jogador.

## Como funciona

| Workflow | Gatilho | O que faz |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR na `main` | Node 22, `npm ci`, `npm run build` (tsc + vite), `npx vitest run` |
| `.github/workflows/pages.yml` | push na `main` | `npx vite build --base=/shadow-ledger/`, copia `index.html` → `404.html` (fallback SPA) e publica `dist` no GitHub Pages |
| `.github/workflows/itch.yml` | manual (`workflow_dispatch`) | build com base `./` e `butler push` para o canal `html5` do itch.io |

A base é passada pela CLI do Vite; `vite.config.ts` não é alterado.
O deploy do Pages **não** depende do CI (só builda); se quiser travar, proteja a `main` exigindo o check "CI".

## GitHub Pages

URL pública: https://gstxxx.github.io/shadow-ledger/

O Pages do repositório usa a fonte "GitHub Actions" (`build_type=workflow`). Para reconfigurar:

```bash
gh api -X PUT repos/Gstxxx/shadow-ledger/pages -f build_type=workflow
```

Cada push na `main` redeploya. Para forçar: aba Actions → "Deploy GitHub Pages" → Run workflow.
Assets devem ser referenciados de forma relativa à base (use `import.meta.env.BASE_URL` para arquivos em `public/`).

## itch.io (HTML5)

1. Crie conta e o projeto no itch.io (tipo **HTML**, marque "This file will be played in the browser" após o primeiro upload).
2. Gere uma chave de API em https://itch.io/user/settings/api-keys.
3. No GitHub: Settings → Secrets and variables → Actions → New repository secret, nome `BUTLER_API_KEY`.
4. Actions → "Publicar no itch.io" → Run workflow, preencha `itch_target` (ex.: `usuario/shadow-ledger`).
5. No painel do projeto no itch, marque o upload `html5` como jogável no navegador e ajuste o tamanho do viewport.

O build do itch usa base `./` (o jogo roda em subpasta/iframe). O butler envia a pasta `dist` inteira, com `index.html` na raiz.

## Notas para PWA / app de celular (ADR 0003)

Ver `docs/adr/0003-web-e-celular-desde-o-inicio.md`. Quando chegar a hora:

- Adicionar `manifest.webmanifest` e service worker (ex.: `vite-plugin-pwa`) — configurar `base`, `scope` e `start_url` conforme o alvo (`/shadow-ledger/` no Pages, `./` no itch; considere desativar o SW no build do itch).
- O fallback `404.html` já cobre rotas diretas no Pages; o SW deve fazer precache do `dist`.
- Saves seguem em `localStorage`/IndexedDB; PWA não muda isso. Para loja (Android/iOS) empacotar com Capacitor ou TWA a partir do mesmo `dist`.
- Ícones 192/512 e maskable precisam vir do kit de arte.
