#!/usr/bin/env node
// adoptar-agents.mjs — migra un AGENTS.md existente a la base del template.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Qué hace (adopción brownfield):
//   1. Backup del AGENTS.md del proyecto en .atlas/backups/agents-<ts>/.
//   2. Copia el AGENTS.md del template (la base, con placeholders) al proyecto.
//   3. Mueve el AGENTS.md anterior a docs/project-context.md (contenido íntegro).
//   4. El bootstrap rellena después los placeholders de la base.
//
// Uso:
//   node .atlas/scripts/adoptar-agents.mjs --template <ruta-template-pristino> [--proyecto .] [--apply]
//   Sin --apply es dry-run.

import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const valor = (flag) => {
  const indice = args.indexOf(flag);
  return indice === -1 ? undefined : args[indice + 1];
};
const proyecto = valor('--proyecto') ?? '.';
const template = valor('--template');
const aplicar = args.includes('--apply');

if (!template) {
  console.error('❌ falta --template <ruta del template prístino>');
  process.exit(1);
}

const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};
const sha256 = async (ruta) => createHash('sha256').update(await readFile(ruta)).digest('hex');

const agentsProyecto = join(proyecto, 'AGENTS.md');
const agentsTemplate = join(template, 'AGENTS.md');
if (!(await existe(agentsProyecto))) {
  console.error('❌ no existe AGENTS.md en el proyecto; en greenfield usa el bootstrap');
  process.exit(1);
}
if (!(await existe(agentsTemplate))) {
  console.error(`❌ no existe ${agentsTemplate}`);
  process.exit(1);
}
if ((await sha256(agentsProyecto)) === (await sha256(agentsTemplate))) {
  console.log('✅ AGENTS.md ya es la base del template; nada que migrar.');
  process.exit(0);
}

const marca = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(proyecto, '.atlas/backups', `agents-${marca}`);
const backup = join(backupDir, 'AGENTS.md');
const contexto = join(proyecto, 'docs/project-context.md');
const fecha = new Date().toISOString().slice(0, 10);
const anterior = await readFile(agentsProyecto, 'utf8');
const cabecera = '# Contexto específico del proyecto\n\n> Capa propia del proyecto que complementa `AGENTS.md`; no lo reemplaza.\n';
const actual = (await existe(contexto)) ? await readFile(contexto, 'utf8') : cabecera;
const nuevoContexto = `${actual.trimEnd()}\n\n## Migrado de AGENTS.md (${fecha})\n\n${anterior.trimEnd()}\n`;

console.log(`Backup:   ${backup}`);
console.log(`Base:     ${agentsTemplate} → ${agentsProyecto}`);
console.log(`Contexto: ${contexto}`);
if (!aplicar) {
  console.log('\n(dry-run) Usa --apply para aplicar.');
  process.exit(0);
}

await mkdir(backupDir, { recursive: true });
await copyFile(agentsProyecto, backup);
await mkdir(join(proyecto, 'docs'), { recursive: true });
await writeFile(contexto, nuevoContexto, 'utf8');
await copyFile(agentsTemplate, agentsProyecto);
console.log('\n✅ AGENTS.md migrado. Rellena los placeholders de la base en la Fase 2 del bootstrap.');
