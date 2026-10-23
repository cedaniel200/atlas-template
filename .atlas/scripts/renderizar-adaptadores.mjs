#!/usr/bin/env node
// renderizar-adaptadores.mjs — genera los adaptadores del host con los
// placeholders ya resueltos desde AGENTS.md.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Canónico vs renderizado: `.atlas/agents/<rol>.md` conserva `{{...}}`;
// el adaptador generado (`.opencode/agent` / `.claude/agents`) se escribe con
// los valores de AGENTS.md § Placeholders. Así el agente no tiene que resolver
// placeholders en su propio prompt.
//
// Multi-stack: `state.stacks` es la fuente única. El rol `engineer` se renderiza
// siempre una vez por stack (`engineer-<id>.md`) con su bloque `{{STACK_CONTEXT}}`,
// incluso cuando solo hay un stack. Así añadir o quitar un stack no renombra los
// adaptadores existentes. Sin stacks (antes del bootstrap) se genera `engineer.md`
// como adaptador genérico; en cuanto hay stacks, se elimina.
//
// Roles opcionales: los prompts marcados con `<!-- optional-role -->` solo se
// renderizan si su id está en `state.optional_agents` (el bootstrap pregunta
// uno por uno). La marca no llega al adaptador.
//
// Uso:
//   node .atlas/scripts/renderizar-adaptadores.mjs [--host opencode|claude] [--template <dir>] [--dry-run]

import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PATRON = /\{\{([A-Z0-9_]+)\}\}/g;
const STACK_CONTEXT = '{{STACK_CONTEXT}}';
const MARCA_OPCIONAL = '<!-- optional-role -->';

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

// Los adaptadores `engineer*` son generados: al cambiar los stacks se eliminan
// los que ya no corresponden (incluido el `engineer.md` genérico).
async function limpiarAdaptadoresObsoletos(directorio, vigentes, log) {
  const entradas = await readdir(directorio, { withFileTypes: true }).catch(() => []);
  for (const entrada of entradas) {
    if (!entrada.isFile() || !entrada.name.startsWith('engineer') || !entrada.name.endsWith('.md')) continue;
    if (vigentes.has(entrada.name)) continue;
    await unlink(join(directorio, entrada.name));
    log(`🧹 ${entrada.name}: adaptador obsoleto eliminado`);
  }
}

// La descripción del adaptador es el primer bloque de cita del prompt canónico
// completo. Se toman todas sus líneas consecutivas (incluidas las vacías `>` que
// separan párrafos) y se unen en una sola frase: quedarse con la primera línea
// truncaba el texto que el host muestra en el selector de agentes.
function extraerDescripcion(cuerpo) {
  const lineas = cuerpo.split('\n');
  const inicio = lineas.findIndex((linea) => linea.startsWith('>'));
  if (inicio === -1) return '';
  const partes = [];
  for (let i = inicio; i < lineas.length && lineas[i].startsWith('>'); i += 1) {
    partes.push(lineas[i].replace(/^>\s?/, ''));
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

// La descripción contiene `: ` y empieza por `**`, así que un escalar plano no es
// YAML válido: se emite entre comillas simples duplicando las internas.
function comillarYaml(texto) {
  return `'${texto.replace(/'/g, "''")}'`;
}

export async function renderizarAdaptadores({
  host,
  template = '.',
  proyecto = '.',
  dryRun = false,
  log = console.log,
} = {}) {
  const state = JSON.parse(await readFile(join(proyecto, '.atlas/state.json'), 'utf8'));
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
  const agentesOpcionales = new Set(Array.isArray(state.optional_agents) ? state.optional_agents : []);
  const directorioAgentes = join(template, '.atlas/agents');
  const destino = hostElegido === 'opencode' ? join(proyecto, '.opencode/agent') : join(proyecto, '.claude/agents');
  if (!dryRun) await mkdir(destino, { recursive: true });

  const renderizados = [];
  const rolesOpcionales = new Set();
  const renderizar = async (rol, archivoSalida, cuerpoCanonico, descripcionExtra = '') => {
    const nombreAdaptador = archivoSalida.replace(/\.md$/, '');
    const sinResolver = [...new Set([...cuerpoCanonico.matchAll(PATRON)].map((m) => m[1]))].filter(
      (nombre) => nombre !== 'STACK_CONTEXT' && (!mapa.has(nombre) || mapa.get(nombre).startsWith('{{')),
    );
    if (sinResolver.length > 0) {
      throw new Error(`${archivoSalida}: placeholders sin resolver en AGENTS.md: ${sinResolver.join(', ')}`);
    }

    const cuerpo = cuerpoCanonico.replace(PATRON, (_, nombre) => mapa.get(nombre));
    const descripcion = extraerDescripcion(cuerpo) || `Rol ${rol} del arnés`;
    const descripcionYaml = comillarYaml(`${descripcion}${descripcionExtra}`);
    const frontmatter =
      hostElegido === 'opencode'
        ? `---\ndescription: ${descripcionYaml}\nmode: all\n---\n\n`
        : `---\nname: ${nombreAdaptador}\ndescription: ${descripcionYaml}\n---\n\n`;

    const archivo = join(destino, archivoSalida);
    if (!dryRun) await writeFile(archivo, frontmatter + cuerpo, 'utf8');
    renderizados.push(archivo);
    log(`✅ ${archivo}`);
  };

  for (const entrada of (await readdir(directorioAgentes)).sort()) {
    if (!entrada.endsWith('.md') || entrada === 'README.md') continue;
    const rol = entrada.slice(0, -3);
    let cuerpoCanonico = await readFile(join(directorioAgentes, entrada), 'utf8');
    const esOpcional = cuerpoCanonico.trimStart().startsWith(MARCA_OPCIONAL);
    if (esOpcional) {
      rolesOpcionales.add(rol);
      if (!agentesOpcionales.has(rol)) continue;
      cuerpoCanonico = cuerpoCanonico.replace(MARCA_OPCIONAL, '').trimStart();
    }

    if (rol === 'engineer') {
      if (stacks.length === 0) {
        // Antes del bootstrap no hay stacks: adaptador genérico de arranque.
        const cuerpo = cuerpoCanonico.replaceAll(
          STACK_CONTEXT,
          'Sin stacks configurados: usa los comandos declarados en `AGENTS.md` § Comandos.',
        );
        await renderizar(rol, `${rol}.md`, cuerpo);
        continue;
      }
      const vigentes = new Set();
      for (const stack of stacks) {
        if (!stack.id) throw new Error('state.stacks: cada stack necesita un `id`');
        const archivo = `${rol}-${stack.id}.md`;
        vigentes.add(archivo);
        const cuerpo = cuerpoCanonico.replaceAll(STACK_CONTEXT, contextoStack(stack));
        await renderizar(rol, archivo, cuerpo, ` — ${stack.id}`);
      }
      if (!dryRun) await limpiarAdaptadoresObsoletos(destino, vigentes, log);
      continue;
    }

    const cuerpo = cuerpoCanonico.replaceAll(
      STACK_CONTEXT,
      'Rol agnóstico al stack: usa los comandos declarados en `AGENTS.md` § Comandos.',
    );
    await renderizar(rol, `${rol}.md`, cuerpo);
  }
  if (!dryRun) {
    for (const rol of rolesOpcionales) {
      if (agentesOpcionales.has(rol)) continue;
      try {
        await unlink(join(destino, `${rol}.md`));
        log(`🧹 ${rol}.md: rol opcional desactivado`);
      } catch {
        // no existía: nada que limpiar
      }
    }
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
