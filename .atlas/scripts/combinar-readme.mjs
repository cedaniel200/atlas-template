#!/usr/bin/env node
// combinar-readme.mjs — añade al README existente las secciones que falten del
// PROJECT-README del template, sin sobrescribir nada.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Uso:
//   node .atlas/scripts/combinar-readme.mjs [--proyecto .] [--plantilla .atlas/PROJECT-README.md] [--apply]
//
// Sin `--apply` es un dry-run: muestra las secciones que añadiría.
// Con `--apply`, añade solo las secciones `##` cuyo título no exista ya en el
// README del proyecto. El título `#` del template se ignora: el README existente
// conserva el suyo.

import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};
const proyecto = valor('--proyecto') ?? '.';
const plantilla = valor('--plantilla') ?? join(proyecto, '.atlas/PROJECT-README.md');
const aplicar = args.includes('--apply');

const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

const mapa = new Map();
const agentsMd = await readFile(join(proyecto, 'AGENTS.md'), 'utf8');
for (const coincidencia of agentsMd.matchAll(/^\|\s*`([A-Z0-9_]+)`\s*\|\s*(.*?)\s*\|\s*$/gm)) {
  mapa.set(coincidencia[1], coincidencia[2]);
}

const sinResolver = new Set();
const plantillaRellena = (await readFile(plantilla, 'utf8')).replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, nombre) => {
  if (!mapa.has(nombre) || mapa.get(nombre).startsWith('{{')) {
    sinResolver.add(nombre);
    return '';
  }
  return mapa.get(nombre);
});
if (sinResolver.size > 0) {
  console.error(`❌ placeholders sin resolver en ${plantilla}: ${[...sinResolver].join(', ')}`);
  process.exit(1);
}

function secciones(texto) {
  const resultado = [];
  let actual = null;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^##\s+/.test(linea)) {
      if (actual) resultado.push(actual);
      actual = { titulo: linea.replace(/^##\s+/, '').trim(), lineas: [linea] };
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  if (actual) resultado.push(actual);
  return resultado;
}

const normalizar = (titulo) => titulo.trim().toLowerCase();
const existente = (await existe(join(proyecto, 'README.md')))
  ? await readFile(join(proyecto, 'README.md'), 'utf8')
  : '';
const titulosExistentes = new Set(secciones(existente).map((seccion) => normalizar(seccion.titulo)));
const faltantes = secciones(plantillaRellena).filter((seccion) => !titulosExistentes.has(normalizar(seccion.titulo)));

if (faltantes.length === 0) {
  console.log('✅ El README ya tiene todas las secciones del PROJECT-README.');
  process.exit(0);
}

console.log(`Secciones que se añadirían (${faltantes.length}):`);
for (const seccion of faltantes) console.log(`  - ## ${seccion.titulo}`);

if (!aplicar) {
  console.log('\n(dry-run) Usa --apply para añadirlas al final del README, sin tocar las existentes.');
  process.exit(0);
}

const bloque = faltantes.map((seccion) => seccion.lineas.join('\n').trimEnd()).join('\n\n');
const contenido = existente.trimEnd();
const resultado = contenido.length > 0 ? `${contenido}\n\n${bloque}\n` : `${plantillaRellena.trimEnd()}\n`;
await writeFile(join(proyecto, 'README.md'), resultado, 'utf8');
console.log(`\n✅ Añadidas ${faltantes.length} sección(es) a README.md.`);
