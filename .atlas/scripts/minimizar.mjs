#!/usr/bin/env node
// minimizar.mjs — archiva material del arnés que el proyecto ya no necesita.
//
// Alcance cerrado (no decide por su cuenta):
//   --examples  .atlas/profiles/_examples/  -> .atlas/archive/profiles/_examples/
//   --hosts     .atlas/hosts/<host inactivo>/ -> .atlas/archive/hosts/<host>/
//   --docs      .atlas/docs/                 -> .atlas/archive/docs/ (solo si ya no hay enlaces)
//   --all       las tres
//
// Nunca borra: mueve a .atlas/archive/, registra en state.displaced y regenera el
// manifiesto para que una actualización posterior no intente tocar lo archivado.
//
// Uso:
//   node .atlas/scripts/minimizar.mjs --dry-run [--examples|--hosts|--docs|--all]
//   node .atlas/scripts/minimizar.mjs --apply   [--examples|--hosts|--docs|--all]

import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ARCHIVO = '.atlas/archive';
const aplicar = process.argv.includes('--apply');
const todos = process.argv.includes('--all');
const scopes = {
  examples: todos || process.argv.includes('--examples'),
  hosts: todos || process.argv.includes('--hosts'),
  docs: todos || process.argv.includes('--docs'),
};

const existe = async (ruta) => access(ruta).then(() => true).catch(() => false);

if (!scopes.examples && !scopes.hosts && !scopes.docs) {
  console.log(`Uso: node .atlas/scripts/minimizar.mjs [--apply] --examples|--hosts|--docs|--all

  --examples  archiva .atlas/profiles/_examples/
  --hosts     archiva plantillas de hosts no activos
  --docs      archiva .atlas/docs/ si ya no hay enlaces que lo referencien
  --all       las tres

Sin --apply solo muestra qué movería. Nunca borra: mueve a ${ARCHIVO}/.`);
  process.exit(0);
}

let estado = {};
try {
  estado = JSON.parse(await readFile('.atlas/state.json', 'utf8'));
} catch {
  console.error('❌ no se pudo leer .atlas/state.json');
  process.exit(1);
}
const hostActivo = estado.host;

const movidos = [];
const omitidos = [];

async function mover(origen, destino) {
  if (!(await existe(origen))) return;
  if (await existe(destino)) {
    omitidos.push(`${origen} (ya existe ${destino})`);
    return;
  }
  if (aplicar) {
    await mkdir(dirname(destino), { recursive: true });
    await rename(origen, destino);
  }
  movidos.push(`${origen} -> ${destino}`);
}

if (scopes.examples) {
  await mover('.atlas/profiles/_examples', join(ARCHIVO, 'profiles/_examples'));
}

if (scopes.hosts) {
  if (!hostActivo) {
    omitidos.push('--hosts: state.host no está definido; no se archiva ningún host');
  } else {
    const entradas = await readdir('.atlas/hosts', { withFileTypes: true }).catch(() => []);
    for (const entrada of entradas) {
      if (!entrada.isDirectory() || entrada.name === hostActivo) continue;
      await mover(join('.atlas/hosts', entrada.name), join(ARCHIVO, 'hosts', entrada.name));
    }
  }
}

if (scopes.docs) {
  const referencias = [];
  for (const doc of ['AGENTS.md', 'docs/README.md', 'docs/README.en.md']) {
    if (!(await existe(doc))) continue;
    const texto = await readFile(doc, 'utf8');
    if (texto.includes('.atlas/docs/')) referencias.push(doc);
  }
  if (referencias.length > 0) {
    omitidos.push(`--docs: ${referencias.join(', ')} aún enlazan .atlas/docs/; elimina esos enlaces antes`);
  } else {
    await mover('.atlas/docs', join(ARCHIVO, 'docs'));
  }
}

if (movidos.length > 0 && aplicar) {
  const desplazados = new Set(Array.isArray(estado.displaced) ? estado.displaced : []);
  for (const movimiento of movidos) desplazados.add(movimiento.split(' -> ')[0]);
  estado.displaced = [...desplazados];
  await writeFile('.atlas/state.json', `${JSON.stringify(estado, null, 2)}\n`, 'utf8');

  if (hostActivo) {
    try {
      execFileSync(process.execPath, ['.atlas/scripts/generar-manifiesto.mjs', '--host', hostActivo], {
        stdio: 'inherit',
      });
    } catch {
      console.error('⚠️ no se pudo regenerar el manifiesto; ejecútalo antes de actualizar ATLAS');
    }
  }
}

console.log(aplicar ? `Minimización aplicada (${ARCHIVO}/):` : 'SIMULACIÓN (sin escribir):');
for (const movimiento of movidos) console.log(`  + ${movimiento}`);
for (const motivo of omitidos) console.log(`  ! ${motivo}`);
if (movidos.length === 0) console.log('  (nada que mover en el alcance elegido)');
