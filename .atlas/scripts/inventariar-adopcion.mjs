#!/usr/bin/env node
// inventariar-adopcion.mjs — inventario de adopción (brownfield) + backup de conflictos.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Compara el template (pristino) con el proyecto y clasifica cada archivo:
//   nuevo    -> el template lo trae y el proyecto no lo tiene
//   igual    -> idéntico (se puede reutilizar)
//   distinto -> existe y difiere (conflicto: se decide con la política de ADOPTION)
// Antes de tocar nada, copia los `distinto` a .atlas/backups/adopcion-<ts>/.
//
// Uso:
//   node .atlas/scripts/inventariar-adopcion.mjs --template /ruta/template-pristino [--proyecto .] [--dry-run]

import { readdir, readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';

const EXCLUIR = new Set([
  '.git', 'node_modules', 'build', 'dist', 'graphify-out',
  '.atlas/backups', '.atlas/adapters',
  '.atlas/state.json', '.atlas/manifest.json',
]);

const sha256 = async (ruta) => createHash('sha256').update(await readFile(ruta)).digest('hex');
const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

async function recorrer(base, dir = '.') {
  const archivos = [];
  for (const entrada of await readdir(join(base, dir), { withFileTypes: true })) {
    const rel = dir === '.' ? entrada.name : join(dir, entrada.name);
    if (EXCLUIR.has(rel) || EXCLUIR.has(entrada.name)) continue;
    if (entrada.isDirectory()) archivos.push(...(await recorrer(base, rel)));
    else archivos.push(rel);
  }
  return archivos;
}

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};
const template = valor('--template');
const proyecto = valor('--proyecto') ?? '.';
const dryRun = args.includes('--dry-run');

if (!template) {
  console.error('❌ falta --template <ruta del template pristino>');
  process.exit(1);
}

const marca = new Date().toISOString().replace(/[:.]/g, '-');
const backup = join(proyecto, '.atlas/backups', `adopcion-${marca}`);
const clases = { nuevo: [], igual: [], distinto: [] };
const notas = [];

for (const rel of await recorrer(template)) {
  const destino = join(proyecto, rel);
  if (!(await existe(destino))) {
    clases.nuevo.push(rel);
    continue;
  }
  if ((await sha256(join(template, rel))) === (await sha256(destino))) {
    clases.igual.push(rel);
    continue;
  }
  clases.distinto.push(rel);
  if (!dryRun) {
    const copia = join(backup, rel);
    await mkdir(dirname(copia), { recursive: true });
    await copyFile(destino, copia);
  }
}

if (await existe(join(proyecto, 'AGENTS.md'))) {
  notas.push('`AGENTS.md` existente: se reemplaza por la base del template (backup) y el contenido propio se migra a `docs/project-context.md`.');
}
if ((await existe(join(proyecto, 'README.md'))) && !(await existe(join(template, 'README.md')))) {
  notas.push('`README.md` existente: se conserva; el bootstrap preguntará si añadir las secciones faltantes de `.atlas/PROJECT-README.md`.');
}

if (!dryRun) {
  const lineas = [
    '# Inventario de adopción',
    '',
    `- Fecha: ${new Date().toISOString()}`,
    `- Template: ${template}`,
    `- Proyecto: ${proyecto}`,
    `- Backup de conflictos: ${clases.distinto.length > 0 ? backup : '—'}`,
    '',
    `## Resumen`,
    '',
    `- Nuevos: ${clases.nuevo.length}`,
    `- Iguales (reutilizables): ${clases.igual.length}`,
    `- Distintos (conflicto): ${clases.distinto.length}`,
    '',
    '## Distintos (conflicto)',
    '',
    '| Archivo | Acción sugerida |',
    '|---|---|',
    ...clases.distinto.map((rel) => `| \`${rel}\` | ${rel === 'AGENTS.md' ? `Reemplazar por la base del template + migrar customizaciones a \`docs/project-context.md\`; backup en \`${backup}\`` : `Revisar y fusionar; backup en \`${backup}\``} |`),
    '',
    ...(notas.length > 0 ? ['## Notas de adopción', '', ...notas.map((nota) => `- ${nota}`), ''] : []),
    '## Nuevos',
    '',
    ...clases.nuevo.map((rel) => `- \`${rel}\``),
    '',
  ];
  await mkdir(join(proyecto, '.atlas'), { recursive: true });
  await writeFile(join(proyecto, '.atlas/adoption-report.md'), `${lineas.join('\n')}\n`, 'utf8');
}

console.log(dryRun ? 'SIMULACIÓN (sin escribir)' : `Inventario escrito en .atlas/adoption-report.md`);
console.log(`  nuevos: ${clases.nuevo.length} · iguales: ${clases.igual.length} · distintos: ${clases.distinto.length}`);
if (clases.distinto.length > 0) {
  console.log(`  conflictos: ${clases.distinto.slice(0, 8).join(', ')}${clases.distinto.length > 8 ? '…' : ''}`);
}
