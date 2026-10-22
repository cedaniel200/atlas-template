#!/usr/bin/env node
// crear-perfil.mjs — crea un preset de stack a partir de la plantilla.
//
// No hay catálogo de perfiles: este script genera solo el que el proyecto necesita.
// El preset resultante es un borrador: completa los comandos y valida ejecutándolos.
//
// Uso:
//   node .atlas/scripts/crear-perfil.mjs --id <id> --language <lenguaje> [opciones]
//
// Opciones:
//   --id <kebab-case>            Identificador del stack (obligatorio)
//   --language <texto>           Lenguaje (obligatorio)
//   --runtime <texto>            Runtime (default: TODO)
//   --package-manager <texto>    Gestor de paquetes (default: TODO)
//   --source <ruta>              Ruta del código (default: TODO)
//   --tests <ruta>               Ruta de tests (default: TODO)
//   --description <texto>        Descripción (default: "Preset <id>")
//   --force                      Sobrescribe si el perfil ya existe
//
// Salida: 0 = creado; 1 = error.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PLANTILLA = '.atlas/profiles/_templates/preset.yaml';
const DIRECTORIO = '.atlas/profiles';

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Uso: node .atlas/scripts/crear-perfil.mjs --id <id> --language <lenguaje> [opciones]

  --id <kebab-case>          Identificador del stack (obligatorio)
  --language <texto>        Lenguaje (obligatorio)
  --runtime <texto>         Runtime (default: TODO)
  --package-manager <texto> Gestor de paquetes (default: TODO)
  --source <ruta>           Ruta del código (default: TODO)
  --tests <ruta>            Ruta de tests (default: TODO)
  --description <texto>     Descripción (default: "Preset <id>")
  --force                   Sobrescribe si existe`);
  process.exit(0);
}

const id = valor('--id');
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('❌ --id es obligatorio y debe ser kebab-case (ej. java-gradle)');
  process.exit(1);
}
const language = valor('--language');
if (!language) {
  console.error('❌ --language es obligatorio');
  process.exit(1);
}

const destino = join(DIRECTORIO, `${id}.yaml`);
const existe = await access(destino).then(() => true).catch(() => false);
if (existe && !args.includes('--force')) {
  console.error(`❌ ${destino} ya existe. Usa --force para sobrescribirlo.`);
  process.exit(1);
}

const reemplazos = {
  ID: id,
  DESCRIPTION: (valor('--description') ?? `Preset ${id}`).replaceAll('"', '\\"'),
  LANGUAGE: language,
  RUNTIME: valor('--runtime') ?? 'TODO',
  PACKAGE_MANAGER: valor('--package-manager') ?? 'TODO',
  SOURCE: valor('--source') ?? 'TODO',
  TESTS: valor('--tests') ?? 'TODO',
};

let texto;
try {
  texto = await readFile(PLANTILLA, 'utf8');
} catch {
  console.error(`❌ no se encontró la plantilla ${PLANTILLA}`);
  process.exit(1);
}
for (const [clave, reemplazo] of Object.entries(reemplazos)) {
  texto = texto.replaceAll(`{{${clave}}}`, reemplazo);
}

await mkdir(DIRECTORIO, { recursive: true });
await writeFile(destino, texto, 'utf8');

console.log(`✅ ${destino} creado.`);
console.log('   1. Completa los comandos con valores reales.');
console.log('   2. Valida: node .atlas/scripts/validar-perfiles.mjs');
console.log('   3. Añade el stack a state.stacks y a AGENTS.md § Stacks.');
console.log('   4. Regenera adaptadores: node .atlas/scripts/renderizar-adaptadores.mjs');
