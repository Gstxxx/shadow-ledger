// Posts a message to the Discord webhook in .env.local: node scripts/notify.mjs "texto"
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = env.DISCORD_WEBHOOK_URL;
if (!url) throw new Error('DISCORD_WEBHOOK_URL ausente em .env.local');

const text = process.argv.slice(2).join(' ') || readFileSync(0, 'utf8');
for (let i = 0; i < text.length; i += 1900) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Shadow Ledger', content: text.slice(i, i + 1900) }),
  });
  if (!res.ok) throw new Error(`Discord respondeu ${res.status}: ${await res.text()}`);
}
