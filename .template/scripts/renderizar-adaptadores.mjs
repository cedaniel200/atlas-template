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
// Multi-stack: `state.stacks` es la fuente única. Si hay más de un stack, el
// rol `engineer` se renderiza una vez por stack (`engineer-<id>.md`) con su
// bloque `{{STACK_CONTEXT}}`; los demás roles son agnósticos al stack. Con un
// solo stack se genera el `engineer.md` genérico.
//
// Uso:
//   node .template/scripts/renderizar-adaptadores.mjs [--host opencode|claude] [--template <dir>] [--dry-run]

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PATRON = /\{\{([A-Z0-9_]+)\}\}/g;
const STACK_CONTEXT = '{{STACK_CONTEXT}}';

function contextoStack(stack) {
  const rutas = Array.isArray(stack.paths) ? stack.paths.map((ruta) => `\`${ruta}\``).join(', ') : stack.paths ?? '—';
  const packs = Array.isArray(stack.packs) && stack.packs.length > 0 ? stack.packs.join(', ') : '—';
  return [
    '',
    `- **Stack**: \`${stack.id}\``,
    `- **Perfil**: ${stack.profile ? `\`${stack.profile}\`` : '—'}`,
    `- **Rutas**: ${rutas || '—'}`,
    `- **Install**: ${stack.install || '—'}`,
    `- **Build**: ${stack.build || '—'}`,
    `- **Run**: ${stack.run || '—'}`,
    `- **Test**: ${stack.test || '—'}`,
    `- **Lint**: ${stack.lint || '—'}`,
    `- **Quality**: ${stack.quality || '—'}`,
    `- **Packs**: ${packs}`,
    '',
  ].join('\n');
}

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

  const agentsMd = await readFile(join(proyecto, 'AGENTS.md'), 'utf8');
  if (/\{\{[A-Z0-9_]+\}\}/.test(agentsMd)) {
    throw new Error('AGENTS.md tiene placeholders sin resolver: completa la Fase 2 antes de generar adaptadores');
  }
  const mapa = new Map();
  for (const coincidencia of agentsMd.matchAll(/^\|\s*`([A-Z0-9_]+)`\s*\|\s*(.*?)\s*\|\s*$/gm)) {
    mapa.set(coincidencia[1], coincidencia[2]);
  }
  if (mapa.size === 0) {
    throw new Error('AGENTS.md no declara la tabla de placeholders');
  }

  const stacks = Array.isArray(state.stacks) ? state.stacks : [];
  const directorioAgentes = join(template, '.template/agents');
  const destino = hostElegido === 'opencode' ? join(proyecto, '.opencode/agent') : join(proyecto, '.claude/agents');
  if (!dryRun) await mkdir(destino, { recursive: true });

  const renderizados = [];
  const renderizar = async (rol, archivoSalida, cuerpoCanonico, descripcionExtra = '') => {
    const sinResolver = [...new Set([...cuerpoCanonico.matchAll(PATRON)].map((m) => m[1]))].filter(
      (nombre) => nombre !== 'STACK_CONTEXT' && (!mapa.has(nombre) || mapa.get(nombre).startsWith('{{')),
    );
    if (sinResolver.length > 0) {
      throw new Error(`${archivoSalida}: placeholders sin resolver en AGENTS.md: ${sinResolver.join(', ')}`);
    }

    const cuerpo = cuerpoCanonico.replace(PATRON, (_, nombre) => mapa.get(nombre));
    const descripcion = (cuerpo.match(/^>\s*(.+)$/m) || [])[1] ?? `Rol ${rol} del arnés`;
    const frontmatter =
      hostElegido === 'opencode'
        ? `---\ndescription: ${descripcion}${descripcionExtra}\nmode: all\n---\n\n`
        : `---\nname: ${rol}\ndescription: ${descripcion}${descripcionExtra}\n---\n\n`;

    const archivo = join(destino, archivoSalida);
    if (!dryRun) await writeFile(archivo, frontmatter + cuerpo, 'utf8');
    renderizados.push(archivo);
    log(`✅ ${archivo}`);
  };

  for (const entrada of (await readdir(directorioAgentes)).sort()) {
    if (!entrada.endsWith('.md') || entrada === 'README.md') continue;
    const rol = entrada.slice(0, -3);
    const cuerpoCanonico = await readFile(join(directorioAgentes, entrada), 'utf8');

    if (rol === 'engineer' && stacks.length > 1) {
      for (const stack of stacks) {
        if (!stack.id) throw new Error('state.stacks: cada stack necesita un `id`');
        const cuerpo = cuerpoCanonico.replaceAll(STACK_CONTEXT, contextoStack(stack));
        await renderizar(rol, `${rol}-${stack.id}.md`, cuerpo, ` — ${stack.id}`);
      }
      continue;
    }

    const contexto = stacks.length === 1
      ? contextoStack(stacks[0])
      : 'Stack único: usa los comandos declarados en `AGENTS.md` § Comandos.';
    const cuerpo = cuerpoCanonico.replaceAll(STACK_CONTEXT, contexto);
    await renderizar(rol, `${rol}.md`, cuerpo);
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
