// Tratamento das imagens de itens (docs/ART.md, "Trocar pela versão gerada").
// Uso: node src/art/tools/grade-items.mjs <pasta-com-<id>.jpg|png|webp> <pasta-de-saida> [id1,id2]
// Abre grade-items.html no Chrome headless e grava <id>-480.webp (≤ 58 KB) e <id>-96.webp.
// Recorte por item (foco fx/fy 0..1 e zoom) em item-crops.json; item sem entrada usa o centro.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [, , srcDir, outDir, only] = process.argv;
if (!srcDir || !outDir) { console.log('uso: node grade-items.mjs <fontes> <saida> [ids]'); process.exit(1); }
const CROP = JSON.parse(readFileSync(new URL('./item-crops.json', import.meta.url), 'utf8'));
mkdirSync(outDir, { recursive: true });
const port = 9200 + Math.floor(Math.random() * 90);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/conta/AppData/Local/Temp/slgr${port}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 40; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const p = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id) p.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.navigate', { url: new URL('./grade-items.html', import.meta.url).href }); await sleep(1500);
const ids = only ? only.split(',') : Object.keys(CROP);
for (const item of ids) {
  const crop = CROP[item] ?? { fx: 0.5, fy: 0.5, zoom: 1 };
  const file = ['jpg', 'png', 'webp'].map((e) => `${srcDir}/${item}.${e}`).find((f) => existsSync(f));
  if (!file) { console.log('sem fonte', item); continue; }
  const src = pathToFileURL(file).href;
  for (const [W, max] of [[480, 58000], [96, 6000]]) {
    const r = await send('Runtime.evaluate', { expression: `grade(${JSON.stringify(src)}, ${JSON.stringify(crop)}, ${W}, ${max})`, awaitPromise: true, returnByValue: true });
    const v = r.result?.result?.value;
    if (!v) { console.log('falhou', item, W, JSON.stringify(r.result?.exceptionDetails?.exception?.description ?? r.result).slice(0, 200)); continue; }
    writeFileSync(`${outDir}/${item}-${W === 480 ? 480 : 96}.webp`, Buffer.from(v.url.split(',')[1], 'base64'));
    console.log(item, W, v.bytes, 'q' + v.q);
  }
}
ws.close(); proc.kill(); process.exit(0);
