#!/usr/bin/env node
// validar-contrato.mjs — comprueba que los placeholders usados pertenecen al contrato
// y que cada stack de `state.stacks` referencia un perfil real del proyecto.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
// Fuente única del contrato: .atlas/PLACEHOLDERS.md
//
// Uso: node .atlas/scripts/validar-contrato.mjs
// Salida: 0 = ok; 1 = hallazgos (placeholders fuera del contrato o stacks inconsistentes).

import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

const CONTRATO = '.atlas/PLACEHOLDERS.md';
const CONSUMIDORES_PROYECTO = ['AGENTS.md', 'openspec/config.yaml', '.atlas/PROJECT-README.md'];
const DIRECTORIOS_PROYECTO = ['.atlas/agents', '.agents/skills'];
const PERFILES = '.atlas/profiles';
const PERFILES_EJEMPLO = '_examples';

async function leer(ruta) {
  return readFile(ruta, 'utf8');
}

async function archivosDe(dir, extension, excluir = []) {
  const encontrados = [];
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (excluir.includes(entrada.name)) continue;
      encontrados.push(...(await archivosDe(ruta, extension, excluir)));
    } else if (entrada.isFile() && entrada.name.endsWith(extension)) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

// Los perfiles de _examples/ son ilustrativos: no cuentan como perfiles del proyecto.
async function perfilesDisponibles(dir = PERFILES) {
  const ids = new Set();
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch {
    return ids;
  }
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === PERFILES_EJEMPLO) continue;
      for (const id of await perfilesDisponibles(ruta)) ids.add(id);
    } else if (entrada.isFile() && entrada.name.endsWith('.yaml')) {
      ids.add(basename(entrada.name, '.yaml'));
      const nombre = (await leer(ruta)).match(/^name:\s*["']?([^"'\s#]+)["']?\s*$/m);
      if (nombre) ids.add(nombre[1]);
    }
  }
  return ids;
}

function nombresUsados(texto) {
  const patron = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  return new Set([...texto.matchAll(patron)].map((coincidencia) => coincidencia[1]));
}

function seccion(texto, titulo) {
  const inicio = texto.indexOf(titulo);
  if (inicio === -1) return '';
  const resto = texto.slice(inicio + titulo.length);
  const siguiente = resto.search(/^## /m);
  return siguiente === -1 ? resto : resto.slice(0, siguiente);
}

function nombresDeTabla(texto) {
  const patron = /^\|\s*`([A-Z_][A-Z0-9_]*)`\s*\|/gm;
  return new Set([...texto.matchAll(patron)].map((coincidencia) => coincidencia[1]));
}

let estado = {};
try {
  estado = JSON.parse(await leer('.atlas/state.json'));
} catch {
  // template sin estado: se asume no configurado
}
const configurado = estado.status === 'configured';

const contrato = await leer(CONTRATO);
const perfilContrato = nombresDeTabla(seccion(contrato, '## 1. Placeholders de perfil'));
const proyectoContrato = nombresDeTabla(seccion(contrato, '## 2. Placeholders de proyecto'));

if (perfilContrato.size === 0 || proyectoContrato.size === 0) {
  console.error(`❌ no se pudieron leer las tablas del contrato (${CONTRATO})`);
  process.exit(1);
}

const errores = [];
const usadosProyecto = new Set();

for (const archivo of CONSUMIDORES_PROYECTO) {
  let texto;
  try {
    texto = await leer(archivo);
  } catch {
    continue; // el proyecto puede no tener todavía su README generado
  }
  for (const nombre of nombresUsados(texto)) {
    usadosProyecto.add(nombre);
    if (!proyectoContrato.has(nombre)) {
      errores.push(`${archivo}: {{${nombre}}} no está en el contrato de proyecto`);
    }
  }
}

for (const directorio of DIRECTORIOS_PROYECTO) {
  for (const archivo of await archivosDe(directorio, '.md')) {
    for (const nombre of nombresUsados(await leer(archivo))) {
      usadosProyecto.add(nombre);
      if (!proyectoContrato.has(nombre)) {
        errores.push(`${relative('.', archivo)}: {{${nombre}}} no está en el contrato de proyecto`);
      }
    }
  }
}

for (const archivo of await archivosDe(PERFILES, '.yaml', ['_templates'])) {
  for (const nombre of nombresUsados(await leer(archivo))) {
    if (!perfilContrato.has(nombre)) {
      errores.push(`${relative('.', archivo)}: {{${nombre}}} no está en el contrato de perfil`);
    }
  }
}

const stacks = Array.isArray(estado.stacks) ? estado.stacks : [];
if (stacks.length > 0) {
  const agentsMd = await leer('AGENTS.md');
  const seccionStacks = seccion(agentsMd, '## Stacks');
  const perfiles = await perfilesDisponibles();
  for (const stack of stacks) {
    if (!stack.id) {
      errores.push('state.stacks: cada stack necesita `id`');
    } else if (!seccionStacks.includes(`\`${stack.id}\``)) {
      errores.push(`AGENTS.md § Stacks: falta el stack ${stack.id}`);
    }
    if (!stack.profile) {
      errores.push(`state.stacks[${stack.id ?? '?'}]: falta \`profile\``);
    } else if (!perfiles.has(stack.profile)) {
      errores.push(
        `state.stacks[${stack.id ?? '?'}].profile: no existe el perfil ${stack.profile} en ${PERFILES} (los ejemplos de ${PERFILES_EJEMPLO}/ no cuentan)`,
      );
    }
  }

  const packsDeStacks = new Set(stacks.flatMap((stack) => (Array.isArray(stack.packs) ? stack.packs : [])));
  const packsEstado = new Set((estado.packs ?? []).map((pack) => (typeof pack === 'string' ? pack : pack.name)));
  for (const pack of packsDeStacks) {
    if (!packsEstado.has(pack)) errores.push(`state.packs: falta el pack ${pack} (declarado en un stack)`);
  }
  for (const pack of packsEstado) {
    try {
      await access(join('.atlas/packs', pack, 'pack.yaml'));
    } catch {
      errores.push(`.atlas/packs/${pack}/pack.yaml: falta el pack activado ${pack}`);
    }
  }

  const host = estado.host;
  const directorio = host === 'opencode' ? '.opencode/agent' : host === 'claude' ? '.claude/agents' : null;
  if (directorio) {
    for (const stack of stacks) {
      const esperado = `engineer-${stack.id}.md`;
      try {
        await access(join(directorio, esperado));
      } catch {
        errores.push(`${directorio}/${esperado}: falta el adaptador del stack ${stack.id}`);
      }
    }
    try {
      await access(join(directorio, 'engineer.md'));
      errores.push(`${directorio}/engineer.md: adaptador obsoleto; el engineer se genera por stack (engineer-<id>.md)`);
    } catch {
      // no existe: correcto cuando hay stacks
    }
  }
}

const agentesOpcionales = Array.isArray(estado.optional_agents) ? estado.optional_agents : [];
if (agentesOpcionales.length > 0) {
  const host = estado.host;
  const directorio = host === 'opencode' ? '.opencode/agent' : host === 'claude' ? '.claude/agents' : null;
  if (!directorio) {
    errores.push(`state.optional_agents: el host ${host ?? '(sin host)'} no soporta subagentes`);
  }
  for (const rol of agentesOpcionales) {
    const canonico = join('.atlas/agents', `${rol}.md`);
    try {
      const texto = await leer(canonico);
      if (!texto.trimStart().startsWith('<!-- optional-role -->')) {
        errores.push(`${canonico}: no está marcado como rol opcional`);
      }
    } catch {
      errores.push(`${canonico}: no existe el prompt del agente opcional ${rol}`);
    }
    if (directorio) {
      try {
        await access(join(directorio, `${rol}.md`));
      } catch {
        errores.push(`${directorio}/${rol}.md: falta el adaptador del agente opcional ${rol}`);
      }
    }
  }
}

const agentsMdSkills = await leer('AGENTS.md');
const registroSkills = seccion(agentsMdSkills, '## Skill Registry');
const nombresRegistro = new Set(
  [...registroSkills.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((coincidencia) => coincidencia[1]),
);
for (const entrada of await readdir('.agents/skills', { withFileTypes: true })) {
  if (!entrada.isDirectory()) continue;
  const skill = join('.agents/skills', entrada.name, 'SKILL.md');
  try {
    await access(skill);
  } catch {
    continue;
  }
  if (!nombresRegistro.has(entrada.name)) {
    errores.push(`${skill}: no está en AGENTS.md § Skill Registry`);
  }
}

if (!configurado) {
  const sinUso = [...proyectoContrato].filter((nombre) => !usadosProyecto.has(nombre)).sort();
  for (const nombre of sinUso) {
    console.warn(`⚠️  {{${nombre}}} está en el contrato de proyecto pero no se usa en ningún archivo`);
  }
}

console.log(
  `Contrato: ${perfilContrato.size} placeholders de perfil, ${proyectoContrato.size} de proyecto.`,
);

if (errores.length > 0) {
  console.error(`\n❌ ${errores.length} hallazgo(s):`);
  for (const error of errores) console.error(`   - ${error}`);
  process.exit(1);
}

console.log('✅ Todos los placeholders usados pertenecen al contrato.');
