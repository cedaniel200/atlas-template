// inventario.test.mjs — pruebas de las reglas de ownership del inventario.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Uso: node --test .atlas/scripts/inventario.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { inventariar } from './lib/inventario.mjs';

async function crearArbol(archivos) {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-inventario-'));
  for (const [rel, contenido] of Object.entries(archivos)) {
    const destino = join(raiz, rel);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }
  return raiz;
}

test('un proyecto Cursor clasifica subagentes y comandos como generados del host activo', async () => {
  const raiz = await crearArbol({
    '.cursor/agents/reviewer.md': '# reviewer\n',
    '.cursor/commands/opsx-apply.md': '# opsx-apply\n',
    '.cursor/mcp.json': '{ "mcpServers": {} }\n',
    'AGENTS.md': '# AGENTS\n',
  });
  try {
    const inventario = await inventariar({ raiz, host: 'cursor' });

    for (const rel of ['.cursor/agents/reviewer.md', '.cursor/commands/opsx-apply.md']) {
      assert.equal(inventario[rel]?.ownership, 'generated', `ownership de ${rel}`);
      assert.equal(inventario[rel]?.origin, 'host:cursor', `origin de ${rel}`);
      assert.match(inventario[rel]?.sha256, /^[0-9a-f]{64}$/, `sha256 de ${rel}`);
    }
    assert.ok(
      !('.cursor/mcp.json' in inventario),
      'la configuración MCP pertenece al usuario y no debe inventariarse',
    );
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('los comandos históricos de Codex y los de OpenCode siguen clasificados', async () => {
  const raiz = await crearArbol({
    '.codex/prompts/opsx-apply.md': '# opsx\n',
    '.opencode/agent/analyst.md': '# analyst\n',
    '.claude/agents/reviewer.md': '# reviewer\n',
  });
  try {
    const inventario = await inventariar({ raiz, host: 'claude' });

    assert.equal(inventario['.codex/prompts/opsx-apply.md']?.origin, 'host:claude');
    assert.equal(inventario['.opencode/agent/analyst.md']?.origin, 'host:claude');
    assert.equal(inventario['.claude/agents/reviewer.md']?.origin, 'host:claude');
    for (const datos of Object.values(inventario)) {
      assert.equal(datos.ownership, 'generated');
    }
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
