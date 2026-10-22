#!/usr/bin/env node
// validar-manifiesto.mjs — verifica que el manifiesto refleja los archivos reales.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Uso: node .template/scripts/validar-manifiesto.mjs
// Salida: 0 = ok; 1 = archivos ausentes, hashes desactualizados o versión incoherente.

import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha256 = async (ruta) => createHash('sha256').update(await readFile(ruta)).digest('hex');
const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

const manifest = JSON.parse(await readFile('.template/manifest.json', 'utf8'));
const state = JSON.parse(await readFile('.template/state.json', 'utf8'));

const errores = [];
const pendientes = [];
for (const [rel, datos] of Object.entries(manifest.files)) {
  // Un `.new` pendiente es un conflicto de actualización sin resolver: no es un
  // error del manifiesto (el archivo local conserva la edición del usuario).
  if (await existe(`${rel}.new`)) {
    pendientes.push(rel);
    continue;
  }
  if (!(await existe(rel))) {
    errores.push(`${rel}: está en el manifiesto pero no existe`);
    continue;
  }
  const actual = await sha256(rel);
  if (actual !== datos.sha256) {
    errores.push(`${rel}: hash desactualizado (manifiesto ${datos.sha256.slice(0, 12)}…, real ${actual.slice(0, 12)}…)`);
  }
}

if (manifest.template_version !== state.template_version) {
  errores.push(
    `versión incoherente: manifest=${manifest.template_version}, state=${state.template_version}`,
  );
}

const total = Object.keys(manifest.files).length;
if (errores.length > 0) {
  console.error(`❌ ${errores.length} hallazgo(s) en ${total} archivo(s):`);
  for (const error of errores.slice(0, 30)) console.error(`   - ${error}`);
  if (errores.length > 30) console.error(`   … y ${errores.length - 30} más`);
  process.exit(1);
}

if (pendientes.length > 0) {
  console.warn(`⚠️  ${pendientes.length} conflicto(s) pendiente(s) (.new sin resolver):`);
  for (const rel of pendientes.slice(0, 20)) console.warn(`   - ${rel}`);
}
console.log(`✅ Manifiesto consistente: ${total} archivo(s), versión ${manifest.template_version}.`);
