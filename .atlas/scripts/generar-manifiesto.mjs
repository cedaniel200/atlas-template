#!/usr/bin/env node
// generar-manifiesto.mjs — genera .atlas/manifest.json con ownership, origin y sha256.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Las reglas de ownership viven en `lib/inventario.mjs`, compartidas con el
// actualizador (que inventaría el template para adoptar archivos managed nuevos).
//
// Uso: node .atlas/scripts/generar-manifiesto.mjs --host opencode|claude|codex

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inventariar } from './lib/inventario.mjs';

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};
const proyecto = valor('--project') ?? '.';
const state = JSON.parse(await readFile(join(proyecto, '.atlas/state.json'), 'utf8'));
const host = valor('--host') ?? state.host;
if (!host) {
  console.error('❌ host no detectado; pasa --host opencode|claude|codex');
  process.exit(1);
}

// La raíz de documentación es configurable (`state.docs.root`); el inventario la
// normaliza y escapa. Sin `state.docs` se usa `docs`, el valor histórico.
const inventario = await inventariar({
  raiz: proyecto,
  raizDocs: state.docs?.root ?? 'docs',
  host,
});

// Se conserva el orden de propiedades histórico del manifiesto (origin, sha256,
// ownership) para que la salida mantenga el mismo formato.
const files = {};
for (const [rel, datos] of Object.entries(inventario)) {
  files[rel] = { origin: datos.origin, sha256: datos.sha256, ownership: datos.ownership };
}

const manifest = {
  template_version: state.template_version ?? '0.1.0',
  generated_at: new Date().toISOString(),
  note: 'Generado por el bootstrap. No editar a mano.',
  files,
};
await writeFile(join(proyecto, '.atlas/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`✅ manifiesto: ${Object.keys(files).length} archivos (host: ${host})`);
