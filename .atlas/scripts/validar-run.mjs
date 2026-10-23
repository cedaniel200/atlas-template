#!/usr/bin/env node
// validar-run.mjs — valida una ejecución paralela experimental.
//
// Modos:
//   node .atlas/scripts/validar-run.mjs --change <id>
//   node .atlas/scripts/validar-run.mjs --run-dir .atlas/run/<id>
//   node .atlas/scripts/validar-run.mjs --program [.atlas/run/program.json]
//
// --program valida un conjunto de changes: runs individuales, solapes de claims
// entre changes, dependencias y contratos congelados.
//
// Salida: 0 = ok; 1 = hallazgos.

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const valor = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};

const existe = async (ruta) => access(ruta).then(() => true).catch(() => false);
const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));
const normalizar = (ruta) => ruta.replace(/^\.\//, '').replace(/\/+$/, '');
const EVENTOS = new Set(['started', 'progress', 'blocked', 'handoff', 'done', 'commit']);
const ESTADOS = new Set(['pending', 'running', 'blocked', 'done']);

async function validarRun(runDir) {
  const errores = [];
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
  if (!plan) return { errores, plan: null, claims: null, estados: new Map() };

  const ids = new Set();
  const porId = new Map();
  const agentes = new Set();
  const estrategia = plan.strategy ?? 'shared-worktree';
  if (!['shared-worktree', 'per-unit-worktree'].includes(estrategia)) {
    errores.push(`plan.json: strategy inválida ${estrategia}`);
  }
  if (estrategia === 'per-unit-worktree' && Array.isArray(plan.units)) {
    const worktrees = new Set();
    for (const unidad of plan.units) {
      if (!unidad.worktree || typeof unidad.worktree !== 'string') {
        errores.push(`plan.json: ${unidad.id ?? '?'} necesita worktree en per-unit-worktree`);
      } else if (worktrees.has(unidad.worktree)) {
        errores.push(`plan.json: worktree duplicado ${unidad.worktree}`);
      } else {
        worktrees.add(unidad.worktree);
      }
    }
  }
  if (!Array.isArray(plan.units) || plan.units.length === 0) {
    errores.push('plan.json: units debe ser una lista no vacía');
  } else {
    for (const unidad of plan.units) {
      if (!unidad.id) errores.push('plan.json: una unidad no tiene id');
      else if (ids.has(unidad.id)) errores.push(`plan.json: id duplicado ${unidad.id}`);
      else {
        ids.add(unidad.id);
        porId.set(unidad.id, unidad);
      }
      if (!unidad.agent) errores.push(`plan.json: ${unidad.id ?? '?'} no tiene agent`);
      else if (agentes.has(unidad.agent)) errores.push(`plan.json: agent duplicado ${unidad.agent}`);
      else agentes.add(unidad.agent);
      if (!Array.isArray(unidad.paths) || unidad.paths.length === 0) {
        errores.push(`plan.json: ${unidad.id ?? '?'} no tiene paths`);
      }
      if (unidad.task !== undefined && (typeof unidad.task !== 'string' || unidad.task.trim() === '')) {
        errores.push(`plan.json: ${unidad.id ?? '?'} task debe ser texto no vacío`);
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
  }

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
      for (const [id, claim] of porUnidad) {
        const planPaths = (porId.get(id)?.paths ?? []).map(normalizar).sort();
        const claimPaths = (claim.paths ?? []).map(normalizar).sort();
        if (JSON.stringify(planPaths) !== JSON.stringify(claimPaths)) {
          errores.push(`claims.json: ${id} paths no coinciden con plan.json`);
        }
      }
      if (estrategia === 'shared-worktree') {
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

  const estados = new Map();
  if (Array.isArray(plan.units)) {
    for (const unidad of plan.units) {
      const ruta = join(runDir, 'agents', unidad.agent, 'status.json');
      try {
        const estado = await leerJson(ruta);
        if (estado.unit !== unidad.id) errores.push(`${ruta}: unit ${estado.unit} no coincide con ${unidad.id}`);
        if (estado.agent !== unidad.agent) errores.push(`${ruta}: agent ${estado.agent} no coincide con ${unidad.agent}`);
        if (!ESTADOS.has(estado.state)) errores.push(`${ruta}: state inválido ${estado.state}`);
        estados.set(unidad.id, estado.state);
        if (estado.state === 'done' && !(await existe(join(runDir, 'handoff', `${unidad.id}.md`)))) {
          errores.push(`${runDir}/handoff/${unidad.id}.md: falta el handoff de ${unidad.id}`);
        }
      } catch {
        errores.push(`${ruta}: falta o no es JSON válido`);
      }
    }
  }

  for (const unidad of plan.units ?? []) {
    if (estados.get(unidad.id) !== 'done') continue;
    for (const dependencia of unidad.depends_on ?? []) {
      if (estados.get(dependencia) !== 'done') {
        errores.push(`plan.json: ${unidad.id} está done pero su dependencia ${dependencia} no`);
      }
    }
  }

  try {
    const lineas = (await readFile(join(runDir, 'journal.ndjson'), 'utf8'))
      .split(/\r?\n/)
      .filter((linea) => linea.trim() !== '');
    const eventos = [];
    for (const [indice, linea] of lineas.entries()) {
      let evento;
      try {
        evento = JSON.parse(linea);
      } catch {
        errores.push(`journal.ndjson:${indice + 1}: no es JSON válido`);
        continue;
      }
      if (!EVENTOS.has(evento.event)) errores.push(`journal.ndjson:${indice + 1}: evento inválido ${evento.event}`);
      if (!porId.has(evento.unit)) errores.push(`journal.ndjson:${indice + 1}: unidad inexistente ${evento.unit}`);
      else if (evento.event === 'commit') {
        if (!evento.sha || !/^[0-9a-f]{7,40}$/i.test(evento.sha)) {
          errores.push(`journal.ndjson:${indice + 1}: sha inválido ${evento.sha ?? '(falta)'}`);
        }
      } else if (evento.agent !== porId.get(evento.unit).agent) {
        errores.push(`journal.ndjson:${indice + 1}: agente ${evento.agent} no coincide con ${evento.unit}`);
      }
      eventos.push(evento);
    }
    for (const [id, estado] of estados) {
      if (estado === 'done' && !eventos.some((evento) => evento.unit === id && evento.event === 'done')) {
        errores.push(`journal.ndjson: falta evento done para ${id}`);
      }
    }
  } catch {
    errores.push(`${runDir}/journal.ndjson: falta`);
  }

  return { errores, plan, claims, estados };
}

async function validarPrograma(programa, runs) {
  const errores = [];
  if (!programa || typeof programa !== 'object') return ['program.json: no es un objeto'];
  if (!Array.isArray(programa.changes) || programa.changes.length === 0) {
    return ['program.json: changes debe ser una lista no vacía'];
  }
  const ids = new Set();
  for (const change of programa.changes) {
    if (!change.id) errores.push('program.json: un change no tiene id');
    else if (ids.has(change.id)) errores.push(`program.json: id duplicado ${change.id}`);
    else ids.add(change.id);
  }
  for (const change of programa.changes) {
    for (const dep of change.depends_on ?? []) {
      if (!ids.has(dep)) errores.push(`program.json: ${change.id} depende de ${dep}, que no existe`);
    }
  }
  const visitando = new Set();
  const visitados = new Set();
  const porId = new Map(programa.changes.map((c) => [c.id, c]));
  const visitar = (id) => {
    if (visitados.has(id)) return;
    if (visitando.has(id)) {
      errores.push(`program.json: ciclo de dependencias en ${id}`);
      return;
    }
    visitando.add(id);
    for (const dep of porId.get(id)?.depends_on ?? []) visitar(dep);
    visitando.delete(id);
    visitados.add(id);
  };
  for (const id of ids) visitar(id);

  const claims = [];
  for (const change of programa.changes) {
    const run = runs.get(change.id);
    if (!run) {
      errores.push(`program.json: falta el run de ${change.id}`);
      continue;
    }
    for (const error of run.errores) errores.push(`[${change.id}] ${error}`);
    for (const claim of run.claims?.claims ?? []) {
      for (const ruta of claim.paths ?? []) {
        claims.push({ change: change.id, unit: claim.unit, ruta: normalizar(ruta) });
      }
    }
  }
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      if (claims[i].change === claims[j].change) continue;
      const a = claims[i].ruta;
      const b = claims[j].ruta;
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) {
        errores.push(
          `program.json: solape entre ${claims[i].change}/${claims[i].unit} y ${claims[j].change}/${claims[j].unit} (${a} / ${b})`,
        );
      }
    }
  }

  const completa = (id) => {
    const run = runs.get(id);
    if (!run?.plan?.units?.length) return false;
    return run.plan.units.every((u) => run.estados.get(u.id) === 'done');
  };
  const algunaDone = (id) => {
    const run = runs.get(id);
    return run?.plan?.units?.some((u) => run.estados.get(u.id) === 'done') ?? false;
  };
  for (const change of programa.changes) {
    if (algunaDone(change.id)) {
      for (const dep of change.depends_on ?? []) {
        if (!completa(dep)) errores.push(`program.json: ${change.id} tiene unidades done pero ${dep} no está completo`);
      }
    }
    if (change.contract && !(await existe(change.contract))) {
      errores.push(`program.json: ${change.id} declara contract ${change.contract}, que no existe`);
    }
  }
  return errores;
}

const modoPrograma = args.includes('--program');
const cambio = valor('--change');
const runDir = valor('--run-dir');

if (!modoPrograma && !cambio && !runDir) {
  console.error('Uso: node .atlas/scripts/validar-run.mjs --change <id> | --run-dir <ruta> | --program [ruta]');
  process.exit(1);
}

if (modoPrograma) {
  const idx = args.indexOf('--program');
  const ruta = args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : '.atlas/run/program.json';
  let programa;
  try {
    programa = await leerJson(ruta);
  } catch {
    console.error(`❌ ${ruta}: falta o no es JSON válido`);
    process.exit(1);
  }
  const runs = new Map();
  for (const change of programa.changes ?? []) {
    if (!change.id) continue;
    runs.set(change.id, await validarRun(join('.atlas/run', change.id)));
  }
  const errores = await validarPrograma(programa, runs);
  if (errores.length > 0) {
    console.error(`❌ ${errores.length} hallazgo(s) en ${ruta}:`);
    for (const error of errores) console.error(`   - ${error}`);
    process.exit(1);
  }
  console.log(`✅ Program ${ruta} consistente (${programa.changes.length} changes).`);
  process.exit(0);
}

const dir = runDir ?? join('.atlas/run', cambio);
const resultado = await validarRun(dir);
if (resultado.errores.length > 0) {
  console.error(`❌ ${resultado.errores.length} hallazgo(s) en ${dir}:`);
  for (const error of resultado.errores) console.error(`   - ${error}`);
  process.exit(1);
}
console.log(`✅ Run ${dir} consistente.`);
