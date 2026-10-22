#!/usr/bin/env node
// crear-pack.mjs — crea un pack vacío a partir de la plantilla.
//
// No hay catálogo de packs: el pack existe solo si el proyecto lo necesita.
// El contenido (skills/agentes) lo aporta el proyecto; esto solo crea el esqueleto.
//
// Uso:
//   node .atlas/scripts/crear-pack.mjs --id <id> [--description <texto>] [--force]
//
// Salida: 0 = creado; 1 = error.

import { access, cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PLANTILLA = '.atlas/packs/_templates/pack';
const DIRECTORIO = '.atlas/packs';

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Uso: node .atlas/scripts/crear-pack.mjs --id <id> [--description <texto>] [--force]

  --id <kebab-case>     Identificador del pack (obligatorio)
  --description <texto> Descripción (default: "Pack <id>")
  --force               Sobrescribe si existe`);
  process.exit(0);
}

const id = valor('--id');
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('❌ --id es obligatorio y debe ser kebab-case (ej. mobile-kmp)');
  process.exit(1);
}

const destino = join(DIRECTORIO, id);
const existe = await access(destino).then(() => true).catch(() => false);
if (existe && !args.includes('--force')) {
  console.error(`❌ ${destino} ya existe. Usa --force para sobrescribirlo.`);
  process.exit(1);
}

try {
  await access(PLANTILLA);
} catch {
  console.error(`❌ no se encontró la plantilla ${PLANTILLA}`);
  process.exit(1);
}

if (existe) await rm(destino, { recursive: true, force: true });
await cp(PLANTILLA, destino, { recursive: true });

const archivo = join(destino, 'pack.yaml');
const reemplazos = {
  ID: id,
  DESCRIPTION: (valor('--description') ?? `Pack ${id}`).replaceAll('"', '\\"'),
};
let texto = await readFile(archivo, 'utf8');
for (const [clave, reemplazo] of Object.entries(reemplazos)) {
  texto = texto.replaceAll(`{{${clave}}}`, reemplazo);
}
await writeFile(archivo, texto, 'utf8');

console.log(`✅ ${destino}/ creado.`);
console.log('   1. Añade skills en skills/<nombre>/SKILL.md (si aplica).');
console.log('   2. Añade agentes en agents/<rol>.md (si aplica).');
console.log('   3. Actívalo en state.stacks[].packs y en state.packs.');
console.log('   4. Copia sus skills a .agents/skills y registra en AGENTS.md § Skill Registry.');
