#!/usr/bin/env node
// mover-legal.mjs — mueve el legal del template a .atlas/legal/ en un proyecto configurado.
//
// Qué mueve: LICENSE, SECURITY.md, SECURITY.es.md, THIRD-PARTY-NOTICES.md y
// THIRD-PARTY-NOTICES.es.md. No genera una licencia del proyecto.
//
// Uso:
//   node .atlas/scripts/mover-legal.mjs            # simulación (no escribe)
//   node .atlas/scripts/mover-legal.mjs --apply    # mueve y actualiza enlaces
//
// En brownfield, ejecútalo solo si los archivos son del template; si el proyecto
// ya tiene los suyos, no los muevas.

import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const LEGALES = [
  'LICENSE',
  'SECURITY.md',
  'SECURITY.es.md',
  'THIRD-PARTY-NOTICES.md',
  'THIRD-PARTY-NOTICES.es.md',
];
const DESTINO = '.atlas/legal';
const DOCS = ['docs/README.md', 'docs/README.en.md'];
const aplicar = process.argv.includes('--apply');

const existe = async (ruta) => access(ruta).then(() => true).catch(() => false);

if (!aplicar) {
  console.log('SIMULACIÓN (sin escribir). Usa --apply para mover.');
}

const movidos = [];
const omitidos = [];
const yaEstaban = [];

for (const archivo of LEGALES) {
  const origen = archivo;
  const destino = join(DESTINO, archivo);
  const hayOrigen = await existe(origen);
  const hayDestino = await existe(destino);

  if (!hayOrigen && hayDestino) {
    yaEstaban.push(archivo);
    continue;
  }
  if (!hayOrigen) continue;
  if (hayDestino) {
    omitidos.push(`${archivo} (ya existe en ${DESTINO}/)`);
    continue;
  }

  if (aplicar) {
    await mkdir(DESTINO, { recursive: true });
    await rename(origen, destino);
  }
  movidos.push(archivo);
}

for (const doc of DOCS) {
  if (!(await existe(doc))) continue;
  let texto = await readFile(doc, 'utf8');
  let cambiado = false;
  for (const archivo of LEGALES) {
    const desde = `../${archivo}`;
    const hacia = `../${DESTINO}/${archivo}`;
    if (texto.includes(desde) && !texto.includes(hacia)) {
      texto = texto.replaceAll(desde, hacia);
      cambiado = true;
    }
  }
  if (cambiado && aplicar) await writeFile(doc, texto, 'utf8');
}

console.log(`Legal del template: ${aplicar ? 'movido' : 'a mover'} a ${DESTINO}/`);
for (const archivo of movidos) console.log(`  + ${archivo}`);
for (const archivo of yaEstaban) console.log(`  = ${archivo} (ya estaba)`);
for (const archivo of omitidos) console.log(`  ! ${archivo}`);
if (movidos.length === 0 && yaEstaban.length === 0 && omitidos.length === 0) {
  console.log('  (no hay archivos legales del template en la raíz)');
}
console.log(
  aplicar
    ? 'Enlaces de docs actualizados. La licencia del proyecto, si se quiere, se solicita aparte.'
    : 'Nada escrito. Ejecuta con --apply para aplicar.',
);
