// inventario.mjs — inventario de archivos del arnés con su ownership, origin y sha256.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Lo comparten `generar-manifiesto.mjs` (inventaría el proyecto) y
// `actualizar-arnes.mjs` (inventaría el template para adoptar archivos managed nuevos).
//
// Reglas (BOOTSTRAP Fase 2):
//   owned     AGENTS.md, README.md, openspec/config.yaml, .env.example, .gitignore,
//             .gitattributes, .editorconfig, <docs.root>/**, adr/**, openspec/specs/**
//   managed   .agents/skills/**, .atlas/agents/**, openspec/schemas/**,
//             .atlas/scripts/**, .atlas/README.md, .atlas/legal/**,
//             .atlas/profiles/_templates/**, .atlas/profiles/_examples/**, .atlas/packs/**,
//             .githooks/**
//   generated .opencode/agent/**, .claude/agents/**, .cursor/agents/**,
//             .opencode/commands/**, .claude/commands/**, .cursor/commands/**,
//             .codex/prompts/**, opencode.json, CLAUDE.md
//             La configuración MCP del host (`.cursor/mcp.json`) queda fuera: es del
//             usuario y el actualizador nunca debe reescribirla.

import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { HOSTS } from './hosts.mjs';

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Las rutas de adaptadores y comandos se derivan del registro de hosts: añadir un
// host no exige recordar este patrón. `.codex/prompts/**` se conserva como ruta
// histórica porque Codex no declara descriptor de adaptador.
const PATRON_GENERADO_HOST = new RegExp(
  [
    ...Object.values(HOSTS).flatMap((host) => [
      `^${escaparRegex(host.agentes)}/`,
      `^${escaparRegex(host.comandos)}/`,
    ]),
    '^\\.codex/prompts/',
    '^opencode\\.json$',
    '^CLAUDE\\.md$',
  ].join('|'),
);

export const EXCLUIR = new Set([
  '.git', 'node_modules', 'build', 'dist', 'graphify-out',
  '.atlas/backups', '.atlas/adapters', '.atlas/archive', '.atlas/run',
  '.atlas/manifest.json', '.atlas/state.json',
]);

// La raíz de documentación es configurable (`state.docs.root`): la regla `owned` se
// construye con ella para inventariar `documentation/` o cualquier otra raíz. Sin
// `state.docs` se usa `docs`, el valor histórico.
const normalizarRaizDocs = (raizDocs) => (raizDocs ?? 'docs').replace(/\/+$/, '') || 'docs';

export function crearReglas({ raizDocs = 'docs', host = 'host' } = {}) {
  const raiz = normalizarRaizDocs(raizDocs);
  const patronRaizDocs = new RegExp(`^${raiz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);

  return [
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
      patron: /^\.githooks\//,
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
      patron: PATRON_GENERADO_HOST,
      ownership: 'generated',
      origin: () => `host:${host}`,
    },
  ];
}

// Rutas relativas (siempre con `/`) de los archivos inventariables, ordenadas.
// Quedan fuera los directorios y archivos de EXCLUIR.
export async function recorrer(raiz, dir = '.') {
  const archivos = [];
  for (const entrada of await readdir(join(raiz, dir), { withFileTypes: true })) {
    const rel = dir === '.' ? entrada.name : `${dir}/${entrada.name}`;
    if (EXCLUIR.has(rel) || EXCLUIR.has(entrada.name)) continue;
    if (entrada.isDirectory()) archivos.push(...(await recorrer(raiz, rel)));
    else archivos.push(rel);
  }
  return archivos.sort();
}

// Inventario `{ [rel]: { ownership, origin, sha256 } }` de los archivos de `raiz`
// que caen en alguna regla.
export async function inventariar({ raiz, raizDocs = 'docs', host = 'host' } = {}) {
  if (!raiz) throw new Error('falta la raíz a inventariar');
  const reglas = crearReglas({ raizDocs, host });
  const files = {};

  for (const rel of await recorrer(raiz)) {
    const regla = reglas.find((candidata) => candidata.patron.test(rel));
    if (!regla) continue;
    const sha256 = createHash('sha256').update(await readFile(join(raiz, rel))).digest('hex');
    files[rel] = { ownership: regla.ownership, origin: regla.origin(rel), sha256 };
  }

  return files;
}
