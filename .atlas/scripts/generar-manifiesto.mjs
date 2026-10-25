#!/usr/bin/env node
// generar-manifiesto.mjs — genera .atlas/manifest.json con ownership, origin y sha256.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Las reglas de ownership viven en `lib/inventario.mjs`, compartidas con el
// actualizador (que inventaría el template para adoptar archivos managed nuevos).
//
// Resolución del inventario en tiempo de ejecución: un proyecto actualizado
// desde < 0.3.0 puede tener este script sin `lib/inventario.mjs` (el updater
// anterior no adoptaba archivos nuevos). Se importa dinámicamente para dar un
// error accionable en lugar de un `ERR_MODULE_NOT_FOUND` sin contexto; el
// updater es quien resuelve el módulo desde el template.
//
// Uso: node .atlas/scripts/generar-manifiesto.mjs --host opencode|claude|cursor|codex

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// El script debe funcionar en un proyecto a medio actualizar que aún no tiene
// `lib/`: no importa el registro de hosts de forma estática. Cuando está
// disponible se deriva de él; si no, conserva la última lista conocida.
const HOSTS_VALIDOS_POR_DEFECTO = 'opencode|claude|cursor|codex';

async function hostsValidos() {
  try {
    const { HOSTS_SOPORTADOS } = await import('./lib/hosts.mjs');
    // Codex no tiene adaptadores, pero sus comandos generados sí se inventarían.
    return [...HOSTS_SOPORTADOS, 'codex'].join('|');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return HOSTS_VALIDOS_POR_DEFECTO;
  }
}

let inventariar;
try {
  ({ inventariar } = await import('./lib/inventario.mjs'));
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.error(
    '❌ falta .atlas/scripts/lib/inventario.mjs: ejecuta antes node .atlas/scripts/actualizar-arnes.mjs --template <ruta del template>',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};
const proyecto = valor('--project') ?? '.';
const state = JSON.parse(await readFile(join(proyecto, '.atlas/state.json'), 'utf8'));
const host = valor('--host') ?? state.host;
if (!host) {
  console.error(`❌ host no detectado; pasa --host ${await hostsValidos()}`);
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
