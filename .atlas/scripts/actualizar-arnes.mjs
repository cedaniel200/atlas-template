#!/usr/bin/env node
// actualizar-arnes.mjs — aplica una versión nueva del template a un proyecto ya configurado.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Reglas de propiedad (`.atlas/docs/es/updating.md`):
//   owned     -> nunca se sobrescribe
//   generated -> se regenera desde el template
//   managed   -> se reemplaza solo si el hash coincide; si no, se escribe <archivo>.new
//
// Un `generated` sin origen en el template pertenece a la herramienta del host
// (`openspec update --tools <host>`): se reporta como ajeno y no se toca.
//
// Además: backup previo, reescritura de manifest.json y state.json (versión,
// commit y hashes) y reporte. Sin esto, la siguiente actualización daría falsos
// conflictos.
//
// Uso:
//   node .atlas/scripts/actualizar-arnes.mjs --template /ruta/template-nuevo [--dry-run]

import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { renderizarAdaptadores } from './renderizar-adaptadores.mjs';
import { inventariar } from './lib/inventario.mjs';

const sha256 = async (ruta) => createHash('sha256').update(await readFile(ruta)).digest('hex');
const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

async function copiarConBackup(rel, proyecto, origen, backup, dryRun) {
  if (!dryRun) {
    const destinoBackup = join(backup, rel);
    await mkdir(dirname(destinoBackup), { recursive: true });
    const destino = join(proyecto, rel);
    if (await existe(destino)) await copyFile(destino, destinoBackup);
    await mkdir(dirname(destino), { recursive: true });
    await copyFile(origen, destino);
  }
}

export async function actualizarArnes({ template, proyecto = '.', dryRun = false, log = console.log } = {}) {
  if (!template) throw new Error('falta --template <ruta del template nuevo>');
  if (!(await existe(join(proyecto, '.atlas/state.json'))) || !(await existe(join(proyecto, '.atlas/manifest.json')))) {
    throw new Error(`${proyecto} no parece un proyecto configurado (faltan .atlas/state.json o manifest.json)`);
  }
  if (!(await existe(join(template, '.atlas/BOOTSTRAP.md')))) {
    throw new Error(`${template} no parece ATLAS (falta .atlas/BOOTSTRAP.md)`);
  }

  const state = JSON.parse(await readFile(join(proyecto, '.atlas/state.json'), 'utf8'));
  if (state.status !== 'configured') {
    throw new Error(`${proyecto} no está configurado (state.status != configured); ejecuta el bootstrap primero`);
  }
  const manifest = JSON.parse(await readFile(join(proyecto, '.atlas/manifest.json'), 'utf8'));
  const stateTemplate = JSON.parse(await readFile(join(template, '.atlas/state.json'), 'utf8'));

  let commit = state.template_source?.commit ?? null;
  let url = state.template_source?.url ?? null;
  if (await existe(join(template, '.git'))) {
    try {
      const opciones = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
      commit = execFileSync('git', ['-C', template, 'rev-parse', 'HEAD'], opciones).trim();
      url = execFileSync('git', ['-C', template, 'remote', 'get-url', 'origin'], opciones).trim();
    } catch {
      // template sin git: se conservan los valores actuales
    }
  }

  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = join(proyecto, '.atlas/backups', marca);
  const host = state.host;
  const resultado = { actualizados: [], sinCambios: [], regenerados: [], conflictos: [], omitidos: [], nuevos: [], eliminados: [], ajenosAlTemplate: [], errores: [] };

  // Los adaptadores se regeneran todos de una vez (y sin placeholders).
  if (!dryRun && ['opencode', 'claude'].includes(host)) {
    await renderizarAdaptadores({ host, template, proyecto, dryRun, log: () => {} });
  }

  for (const [rel, datos] of Object.entries(manifest.files)) {
    const origen = join(template, rel);
    const enTemplate = await existe(origen);
    const enProyecto = await existe(join(proyecto, rel));

    if (datos.ownership === 'owned') {
      resultado.omitidos.push(rel);
      continue;
    }

    if (datos.ownership === 'generated') {
      if (rel.startsWith('.opencode/agent/') || rel.startsWith('.claude/agents/')) {
        if (dryRun) resultado.regenerados.push(rel);
        else {
          await mkdir(dirname(join(proyecto, rel)), { recursive: true });
          if (await existe(join(proyecto, rel))) {
            manifest.files[rel].sha256 = await sha256(join(proyecto, rel));
            resultado.regenerados.push(rel);
          } else {
            resultado.errores.push(`${rel}: el renderizador no generó el adaptador`);
          }
        }
        continue;
      }
      let origenGenerated = origen;
      if (rel === 'opencode.json') origenGenerated = join(template, '.atlas/hosts/opencode/opencode.json');
      if (rel === 'CLAUDE.md') origenGenerated = join(template, 'CLAUDE.md');
      if (!(await existe(origenGenerated))) {
        // El archivo pertenece a la herramienta del host (`openspec update --tools <host>`):
        // el manifiesto solo lo registra, así que no hay nada que copiar ni eliminar.
        resultado.ajenosAlTemplate.push(rel);
        continue;
      }
      await copiarConBackup(rel, proyecto, origenGenerated, backup, dryRun);
      if (!dryRun) manifest.files[rel].sha256 = await sha256(join(proyecto, rel));
      resultado.regenerados.push(rel);
      continue;
    }

    // managed
    if (!enTemplate) {
      resultado.eliminados.push(rel);
      continue;
    }
    if (!enProyecto) {
      resultado.errores.push(`${rel}: está en el manifiesto pero no en el proyecto`);
      continue;
    }
    const actual = await sha256(join(proyecto, rel));
    if (actual === datos.sha256) {
      const nueva = await sha256(origen);
      if (nueva === actual) {
        resultado.sinCambios.push(rel);
        continue;
      }
      await copiarConBackup(rel, proyecto, origen, backup, dryRun);
      if (!dryRun) manifest.files[rel].sha256 = await sha256(join(proyecto, rel));
      resultado.actualizados.push(rel);
    } else {
      if (!dryRun) {
        await mkdir(dirname(join(proyecto, `${rel}.new`)), { recursive: true });
        await copyFile(origen, join(proyecto, `${rel}.new`));
        manifest.files[rel].sha256 = await sha256(origen);
      }
      resultado.conflictos.push(rel);
    }
  }

  // Adopción de archivos que el template añade en una versión nueva. Solo `managed`:
  //   - `owned` pertenece al proyecto, así que un archivo nuevo del template no se copia.
  //   - `generated` lo regenera el host (`openspec update --tools <host>`) o el
  //     renderizador; tampoco se adopta.
  // Se inventaría el template (el suyo trae `files: {}` y no permite conocer su
  // inventario) y se ignora lo que el manifiesto del proyecto ya sigue. Si el destino
  // existe sin seguimiento, nunca se sobrescribe: se escribe `<rel>.new`.
  const inventarioTemplate = await inventariar({
    raiz: template,
    raizDocs: stateTemplate.docs?.root ?? 'docs',
    host,
  });
  for (const rel of Object.keys(inventarioTemplate).sort()) {
    const datos = inventarioTemplate[rel];
    if (datos.ownership !== 'managed' || rel in manifest.files) continue;

    const origen = join(template, rel);
    if (await existe(join(proyecto, rel))) {
      if (!dryRun) {
        await mkdir(dirname(join(proyecto, `${rel}.new`)), { recursive: true });
        await copyFile(origen, join(proyecto, `${rel}.new`));
        manifest.files[rel] = { origin: datos.origin, ownership: datos.ownership, sha256: datos.sha256 };
      }
      resultado.conflictos.push(rel);
      continue;
    }

    if (!dryRun) {
      await copiarConBackup(rel, proyecto, origen, backup, false);
      manifest.files[rel] = {
        origin: datos.origin,
        ownership: datos.ownership,
        sha256: await sha256(join(proyecto, rel)),
      };
    }
    resultado.nuevos.push(rel);
  }

  if (!dryRun) {
    manifest.template_version = stateTemplate.template_version ?? manifest.template_version;
    manifest.generated_at = new Date().toISOString();
    await writeFile(join(proyecto, '.atlas/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    state.template_version = manifest.template_version;
    state.template_source = { url, commit };
    state.updated_at = new Date().toISOString();
    await writeFile(join(proyecto, '.atlas/state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  log(dryRun ? 'SIMULACIÓN (sin escribir)' : `Actualización aplicada. Backup: ${backup}`);
  for (const [clave, valores] of Object.entries(resultado)) {
    log(`  ${clave}: ${valores.length}${valores.length > 0 ? ` → ${valores.slice(0, 5).join(', ')}${valores.length > 5 ? '…' : ''}` : ''}`);
  }
  log(`  versión: ${manifest.template_version} · commit: ${commit ?? 'sin commit'}`);
  return resultado;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const indice = args.indexOf('--template');
  try {
    await actualizarArnes({
      template: indice === -1 ? undefined : args[indice + 1],
      dryRun: args.includes('--dry-run'),
    });
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}
