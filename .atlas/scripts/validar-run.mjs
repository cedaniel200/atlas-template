#!/usr/bin/env node
// validar-run.mjs — valida el estado de una ejecución paralela experimental.
//
// Herramienta de mantenimiento, no un gate del bootstrap. Comprueba que el plan,
// los claims, el journal y los handoffs son coherentes antes de integrar.
//
// Uso:
//   node .atlas/scripts/validar-run.mjs --change <id>
//   node .atlas/scripts/validar-run.mjs --run-dir .atlas/run/<id>
//
// Salida: 0 = ok; 1 = hallazgos.

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const valor = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};

const cambio = valor('--change');
const runDir = valor('--run-dir') ?? (cambio ? join('.atlas/run', cambio) : undefined);
if (!runDir) {
  console.error('Uso: node .atlas/scripts/validar-run.mjs --change <id> [--run-dir <ruta>]');
  process.exit(1);
}

const existe = async (ruta) => access(ruta).then(() => true).catch(() => false);
const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));
const errores = [];

const normalizar = (ruta) => ruta.replace(/^\.\//, '').replace(/\/+$/, '');

let plan;
let claims;
try {
  plan = await leerJson(join(runDir, 'plan.json'));
} catch {
  errores.push(`${runDir}/plan.json: falta o no es JSON válido`);
}
try {
  claims = await leerJson(join(runDir, 'claims.json'));
} catch {
  errores.push(`${runDir}/claims.json: falta o no es JSON válido`);
}

if (plan) {
  if (!Array.isArray(plan.units) || plan.units.length === 0) {
    errores.push('plan.json: units debe ser una lista no vacía');
  } else {
    const ids = new Set();
    for (const unidad of plan.units) {
      if (!unidad.id) errores.push('plan.json: una unidad no tiene id');
      else if (ids.has(unidad.id)) errores.push(`plan.json: id duplicado ${unidad.id}`);
      else ids.add(unidad.id);
      if (!unidad.agent) errores.push(`plan.json: ${unidad.id ?? '?'} no tiene agent`);
      if (!Array.isArray(unidad.paths) || unidad.paths.length === 0) {
        errores.push(`plan.json: ${unidad.id ?? '?'} no tiene paths`);
      }
      if (unidad.depends_on && !Array.isArray(unidad.depends_on)) {
        errores.push(`plan.json: ${unidad.id ?? '?'} depends_on debe ser lista`);
      }
    }
    for (const unidad of plan.units) {
      for (const dependencia of unidad.depends_on ?? []) {
        if (!ids.has(dependencia)) {
          errores.push(`plan.json: ${unidad.id} depende de ${dependencia}, que no existe`);
        }
      }
    }
    const visitando = new Set();
    const visitados = new Set();
    const porId = new Map(plan.units.map((u) => [u.id, u]));
    const visitar = (id) => {
      if (visitados.has(id)) return;
      if (visitando.has(id)) {
        errores.push(`plan.json: ciclo de dependencias en ${id}`);
        return;
      }
      visitando.add(id);
      for (const dependencia of porId.get(id)?.depends_on ?? []) visitar(dependencia);
      visitando.delete(id);
      visitados.add(id);
    };
    for (const id of ids) visitar(id);

    if (claims) {
      if (!Array.isArray(claims.claims)) {
        errores.push('claims.json: claims debe ser una lista');
      } else {
        const porUnidad = new Map();
        for (const claim of claims.claims) {
          if (!claim.unit || !porId.has(claim.unit)) {
            errores.push(`claims.json: claim de unidad inexistente ${claim.unit ?? '?'}`);
            continue;
          }
          if (porUnidad.has(claim.unit)) errores.push(`claims.json: claim duplicado para ${claim.unit}`);
          porUnidad.set(claim.unit, claim);
          const esperado = porId.get(claim.unit).agent;
          if (claim.agent !== esperado) {
            errores.push(`claims.json: ${claim.unit} declara agente ${claim.agent}, el plan dice ${esperado}`);
          }
          if (!Array.isArray(claim.paths) || claim.paths.length === 0) {
            errores.push(`claims.json: ${claim.unit} no tiene paths`);
          }
        }
        for (const id of ids) {
          if (!porUnidad.has(id)) errores.push(`claims.json: falta el claim de ${id}`);
        }
        const todos = [...porUnidad.values()].flatMap((claim) =>
          (claim.paths ?? []).map((ruta) => ({ unit: claim.unit, ruta: normalizar(ruta) })),
        );
        for (let i = 0; i < todos.length; i += 1) {
          for (let j = i + 1; j < todos.length; j += 1) {
            if (todos[i].unit === todos[j].unit) continue;
            const a = todos[i].ruta;
            const b = todos[j].ruta;
            if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) {
              errores.push(`claims.json: solape de rutas entre ${todos[i].unit} y ${todos[j].unit} (${a} / ${b})`);
            }
          }
        }
      }
    }
  }

  // Estados por agente/unidad
  const estados = new Map();
  if (Array.isArray(plan.units)) {
    for (const unidad of plan.units) {
      const ruta = join(runDir, 'agents', unidad.agent, 'status.json');
      try {
        const estado = await leerJson(ruta);
        if (estado.unit !== unidad.id) errores.push(`${ruta}: unit ${estado.unit} no coincide con ${unidad.id}`);
        if (estado.agent !== unidad.agent) errores.push(`${ruta}: agent ${estado.agent} no coincide con ${unidad.agent}`);
        if (!['pending', 'running', 'blocked', 'done'].includes(estado.state)) {
          errores.push(`${ruta}: state inválido ${estado.state}`);
        }
        estados.set(unidad.id, estado.state);
        if (estado.state === 'done' && !(await existe(join(runDir, 'handoff', `${unidad.id}.md`)))) {
          errores.push(`${runDir}/handoff/${unidad.id}.md: falta el handoff de ${unidad.id}`);
        }
      } catch {
        errores.push(`${ruta}: falta o no es JSON válido`);
      }
    }
  }

  // Dependencias: una unidad done exige dependencias done
  for (const unidad of plan.units ?? []) {
    if (estados.get(unidad.id) !== 'done') continue;
    for (const dependencia of unidad.depends_on ?? []) {
      if (estados.get(dependencia) !== 'done') {
        errores.push(`plan.json: ${unidad.id} está done pero su dependencia ${dependencia} no`);
      }
    }
  }

  // Journal NDJSON
  try {
    const lineas = (await readFile(join(runDir, 'journal.ndjson'), 'utf8'))
      .split(/\r?\n/)
      .filter((linea) => linea.trim() !== '');
    const eventos = new Set(['started', 'progress', 'blocked', 'handoff', 'done']);
    const ids = new Set((plan.units ?? []).map((u) => u.id));
    for (const [indice, linea] of lineas.entries()) {
      let evento;
      try {
        evento = JSON.parse(linea);
      } catch {
        errores.push(`journal.ndjson:${indice + 1}: no es JSON válido`);
        continue;
      }
      if (!eventos.has(evento.event)) errores.push(`journal.ndjson:${indice + 1}: evento inválido ${evento.event}`);
      if (!ids.has(evento.unit)) errores.push(`journal.ndjson:${indice + 1}: unidad inexistente ${evento.unit}`);
    }
    for (const [id, estado] of estados) {
      if (estado === 'done' && !lineas.some((l) => { try { const e = JSON.parse(l); return e.unit === id && e.event === 'done'; } catch { return false; } })) {
        errores.push(`journal.ndjson: falta evento done para ${id}`);
      }
    }
  } catch {
    errores.push(`${runDir}/journal.ndjson: falta`);
  }
}

if (errores.length > 0) {
  console.error(`❌ ${errores.length} hallazgo(s) en ${runDir}:`);
  for (const error of errores) console.error(`   - ${error}`);
  process.exit(1);
}
console.log(`✅ Run ${runDir} consistente.`);
