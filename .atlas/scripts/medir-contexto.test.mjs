// medir-contexto.test.mjs — pruebas del medidor de coste de contexto.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// El script tiene código de nivel superior y resuelve rutas desde el cwd, así que
// cada caso lo ejecuta como subproceso sobre una fixture temporal.
//
// Uso: node --test .atlas/scripts/medir-contexto.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUTA_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), 'medir-contexto.mjs');

async function escribir(raiz, rel, contenido) {
  const destino = join(raiz, rel);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido, 'utf8');
}

async function medir(raiz) {
  const salida = spawnSync(process.execPath, [RUTA_SCRIPT, '--json'], {
    cwd: raiz,
    encoding: 'utf8',
  });
  assert.equal(salida.status, 0, `stderr: ${salida.stderr}`);
  return JSON.parse(salida.stdout);
}

test('solo mide los adaptadores del host activo', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-medir-'));
  try {
    await escribir(
      raiz,
      '.atlas/state.json',
      `${JSON.stringify({ host: 'cursor', optional_agents: [] })}\n`,
    );
    await escribir(
      raiz,
      '.cursor/agents/reviewer.md',
      '---\nname: reviewer\ndescription: review\n---\n\nRevisa.\n',
    );
    await escribir(
      raiz,
      '.opencode/agent/analyst.md',
      '---\ndescription: analyst\nmode: all\n---\n\nAnaliza.\n',
    );

    const informe = await medir(raiz);

    assert.equal(informe.fuenteAgentes, 'adaptadores del host');
    const archivos = informe.porAgente.map((agente) => agente.archivo);
    assert.deepEqual(archivos, ['reviewer.md']);
    assert.ok(!archivos.includes('analyst.md'), 'no debe contar adaptadores de hosts inactivos');
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
