#!/usr/bin/env node
// renderizar-adaptadores.mjs — genera los adaptadores del host con los
// placeholders ya resueltos desde AGENTS.md.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Canónico vs renderizado: `.template/agents/<rol>.md` conserva `{{...}}`;
// el adaptador generado (`.opencode/agent` / `.claude/agents`) se escribe con
// los valores de AGENTS.md § Placeholders. Así el agente no tiene que resolver
// placeholders en su propio prompt.
//
// Uso:
//   node .template/scripts/renderizar-adaptadores.mjs [--host opencode|claude] [--template <dir>] [--dry-run]

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PATRON = /\{\{([A-Z0-9_]+)\}\}/g;

export async function renderizarAdaptadores({
  host,
  template = '.',
  proyecto = '.',
  dryRun = false,
  log = console.log,
} = {}) {
  const state = JSON.parse(await readFile(join(proyecto, '.template/state.json'), 'utf8'));
  const hostElegido = host ?? state.host;
  if (!['opencode', 'claude'].includes(hostElegido)) {
    throw new Error(`host no soportado: ${hostElegido} (usa opencode o claude)`);
  }
  if (state.status !== 'configured') {
    throw new Error('AGENTS.md no está configurado (state.status != configured): no se pueden resolver placeholders');
  }

  const agentsMd = await readFile(join(proyecto, 'AGENTS.md'), 'utf8');
  const mapa = new Map();
  for (const coincidencia of agentsMd.matchAll(/^\|\s*`([A-Z0-9_]+)`\s*\|\s*(.*?)\s*\|\s*$/gm)) {
    mapa.set(coincidencia[1], coincidencia[2]);
  }
  if (mapa.size === 0) {
    throw new Error('AGENTS.md no declara la tabla de placeholders');
  }

  const directorioAgentes = join(template, '.template/agents');
  const destino = hostElegido === 'opencode' ? join(proyecto, '.opencode/agent') : join(proyecto, '.claude/agents');
  if (!dryRun) await mkdir(destino, { recursive: true });

  const renderizados = [];
  for (const entrada of (await readdir(directorioAgentes)).sort()) {
    if (!entrada.endsWith('.md') || entrada === 'README.md') continue;
    const rol = entrada.slice(0, -3);
    const cuerpoCanonico = await readFile(join(directorioAgentes, entrada), 'utf8');

    const sinResolver = [...new Set([...cuerpoCanonico.matchAll(PATRON)].map((m) => m[1]))].filter(
      (nombre) => !mapa.has(nombre) || mapa.get(nombre).startsWith('{{'),
    );
    if (sinResolver.length > 0) {
      throw new Error(`${entrada}: placeholders sin resolver en AGENTS.md: ${sinResolver.join(', ')}`);
    }

    const cuerpo = cuerpoCanonico.replace(PATRON, (_, nombre) => mapa.get(nombre));
    const descripcion = (cuerpo.match(/^>\s*(.+)$/m) || [])[1] ?? `Rol ${rol} del arnés`;
    const frontmatter =
      hostElegido === 'opencode'
        ? `---\ndescription: ${descripcion}\nmode: all\n---\n\n`
        : `---\nname: ${rol}\ndescription: ${descripcion}\n---\n\n`;

    const archivo = join(destino, `${rol}.md`);
    if (!dryRun) await writeFile(archivo, frontmatter + cuerpo, 'utf8');
    renderizados.push(archivo);
    log(`✅ ${archivo}`);
  }
  log(`\n${renderizados.length} adaptador(es) renderizado(s) para ${hostElegido}.`);
  return renderizados;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const valor = (flag) => {
    const indice = args.indexOf(flag);
    return indice === -1 ? undefined : args[indice + 1];
  };
  try {
    await renderizarAdaptadores({
      host: valor('--host'),
      template: valor('--template') ?? '.',
      dryRun: args.includes('--dry-run'),
    });
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}
