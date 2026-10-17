// Cria a cópia do motor com as propostas de um lote aplicadas (chamado pela config, antes de tudo).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { variantPatches } from './proposals';

export function buildVariant(root: string, name: string): string {
  const dir = join(root, 'node_modules/.cache/shadow-balance', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // O motor importa outras pastas de src (ex.: i18n): copia src inteiro, sem testes nem arte.
  cpSync(join(root, 'src'), join(dir, 'src'), { recursive: true, filter: (p) => !/__tests__|[\\/]art[\\/]/.test(p) });
  for (const p of variantPatches(name)) {
    const file = join(dir, p.file);
    // Os arquivos podem estar com CRLF no Windows; as propostas usam LF.
    const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    // Já aplicada no motor: nada a fazer.
    if (!src.includes(p.from) && src.includes(p.to)) continue;
    if (!src.includes(p.from)) throw new Error(`Proposta ${p.id}: trecho não encontrado em ${p.file}:\n${p.from}`);
    writeFileSync(file, src.replace(p.from, p.to));
  }
  return dir;
}
