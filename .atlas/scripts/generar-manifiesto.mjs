#!/usr/bin/env node
// generar-manifiesto.mjs — genera .atlas/manifest.json con ownership, origin y sha256.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Reglas (BOOTSTRAP Fase 2):
//   owned     AGENTS.md, README.md, openspec/config.yaml, .env.example, .gitignore,
//             .gitattributes, .editorconfig, <docs.root>/**, adr/**, openspec/specs/**
//   managed   .agents/skills/**, .atlas/agents/**, openspec/schemas/**,
//             .atlas/scripts/**, .atlas/README.md, .atlas/legal/**,
//             .atlas/profiles/_templates/**, .atlas/profiles/_examples/**, .atlas/packs/**
//   generated .opencode/agent/**, .claude/agents/**, .opencode/commands/**,
//             .claude/commands/**, .codex/prompts/**, opencode.json, CLAUDE.md
//
// Uso: node .atlas/scripts/generar-manifiesto.mjs --host opencode|claude|codex

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

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

const EXCLUIR = new Set([
  '.git', 'node_modules', 'build', 'dist', 'graphify-out',
  '.atlas/backups', '.atlas/adapters', '.atlas/archive', '.atlas/run',
  '.atlas/manifest.json', '.atlas/state.json',
]);

// La raíz de documentación es configurable (`state.docs.root`): la regla `owned` se
// construye con ella para inventariar `documentation/` o cualquier otra raíz. Sin
// `state.docs` se usa `docs`, el valor histórico.
const raizDocs = (state.docs?.root ?? 'docs').replace(/\/+$/, '') || 'docs';
const patronRaizDocs = new RegExp(`^${raizDocs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);

const REGLAS = [
  {
    patron: /^(AGENTS\.md|README\.md|\.env\.example|\.gitignore|\.gitattributes|\.editorconfig)$/,
    ownership: 'owned',
    origin: () => 'core',
  },
  {
    patron: /^openspec\/config\.yaml$|^adr\/|^openspec\/specs\//,
    ownership: 'owned',
    origin: () => 'core',
  },
  {
    patron: patronRaizDocs,
    ownership: 'owned',
    origin: () => 'core',
  },
  {
    patron: /^\.agents\/skills\/|^\.atlas\/agents\/|^openspec\/schemas\//,
    ownership: 'managed',
    origin: () => 'core',
  },
  {
    patron: /^\.atlas\/scripts\/|^\.atlas\/README\.md$/,
    ownership: 'managed',
    origin: () => 'core',
  },
  {
    patron: /^\.atlas\/legal\//,
    ownership: 'managed',
    origin: () => 'core',
  },
  {
    patron: /^\.atlas\/profiles\/_(templates|examples)\//,
    ownership: 'managed',
    origin: () => 'core',
  },
  {
    patron: /^\.atlas\/packs\//,
    ownership: 'managed',
    origin: (rel) => `pack:${rel.split('/')[2]}`,
  },
  {
    patron:
      /^\.opencode\/agent\/|^\.claude\/agents\/|^\.opencode\/commands\/|^\.claude\/commands\/|^\.codex\/prompts\/|^opencode\.json$|^CLAUDE\.md$/,
    ownership: 'generated',
    origin: () => `host:${host}`,
  },
];

async function recorrer(dir = '.') {
  const archivos = [];
  for (const entrada of await readdir(join(proyecto, dir), { withFileTypes: true })) {
    const rel = dir === '.' ? entrada.name : `${dir}/${entrada.name}`;
    if (EXCLUIR.has(rel) || EXCLUIR.has(entrada.name)) continue;
    if (entrada.isDirectory()) archivos.push(...(await recorrer(rel)));
    else archivos.push(rel);
  }
  return archivos;
}

const files = {};
for (const rel of (await recorrer()).sort()) {
  const regla = REGLAS.find((candidata) => candidata.patron.test(rel));
  if (!regla) continue;
  const sha256 = createHash('sha256').update(await readFile(join(proyecto, rel))).digest('hex');
  files[rel] = { origin: regla.origin(rel), sha256, ownership: regla.ownership };
}

const manifest = {
  template_version: state.template_version ?? '0.1.0',
  generated_at: new Date().toISOString(),
  note: 'Generado por el bootstrap. No editar a mano.',
  files,
};
await writeFile(join(proyecto, '.atlas/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`✅ manifiesto: ${Object.keys(files).length} archivos (host: ${host})`);
