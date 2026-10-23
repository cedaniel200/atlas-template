// actualizar-arnes.test.mjs — pruebas del actualizador del arnés.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Uso: node --test .atlas/scripts/actualizar-arnes.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { actualizarArnes } from './actualizar-arnes.mjs';

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

async function escribir(ruta, contenido) {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido, 'utf8');
}

const OPSX = '# opsx-apply\n\nComando generado por `openspec update --tools opencode`.\n';
const GONE = '# gone\n\nAgente que ya no existe en el template.\n';
const SAME = '# same\n\nAgente idéntico en proyecto y template.\n';

async function crearProyecto(raiz) {
  const proyecto = join(raiz, 'proyecto');
  await escribir(
    join(proyecto, '.atlas/state.json'),
    `${JSON.stringify(
      {
        status: 'configured',
        host: 'codex',
        template_version: '0.1.2',
        template_source: { url: 'https://example.test/atlas-template', commit: '916e53b' },
      },
      null,
      2,
    )}\n`,
  );
  await escribir(
    join(proyecto, '.atlas/manifest.json'),
    `${JSON.stringify(
      {
        template_version: '0.1.2',
        generated_at: null,
        files: {
          '.opencode/commands/opsx-apply.md': {
            ownership: 'generated',
            origin: 'host:opencode',
            sha256: sha256(OPSX),
          },
          '.atlas/agents/gone.md': { ownership: 'managed', origin: 'core', sha256: sha256(GONE) },
          '.atlas/agents/same.md': { ownership: 'managed', origin: 'core', sha256: sha256(SAME) },
        },
      },
      null,
      2,
    )}\n`,
  );
  await escribir(join(proyecto, '.opencode/commands/opsx-apply.md'), OPSX);
  await escribir(join(proyecto, '.atlas/agents/gone.md'), GONE);
  await escribir(join(proyecto, '.atlas/agents/same.md'), SAME);
  return proyecto;
}

async function crearTemplate(raiz) {
  const template = join(raiz, 'template');
  await escribir(join(template, '.atlas/BOOTSTRAP.md'), '# Bootstrap\n');
  await escribir(join(template, '.atlas/state.json'), `${JSON.stringify({ template_version: '0.1.3' })}\n`);
  await escribir(join(template, '.atlas/agents/same.md'), SAME);
  return template;
}

test('los comandos del host no se reportan como eliminados ni se tocan', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplate(raiz);

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    // El manifiesto solo registra los artefactos del host: no hay nada que copiar ni borrar.
    assert.deepEqual(resultado.ajenosAlTemplate, ['.opencode/commands/opsx-apply.md']);
    assert.deepEqual(resultado.eliminados, ['.atlas/agents/gone.md']);
    assert.equal(await readFile(join(proyecto, '.opencode/commands/opsx-apply.md'), 'utf8'), OPSX);
    assert.ok(resultado.sinCambios.includes('.atlas/agents/same.md'));
    assert.deepEqual(resultado.errores, []);

    const manifest = JSON.parse(await readFile(join(proyecto, '.atlas/manifest.json'), 'utf8'));
    const state = JSON.parse(await readFile(join(proyecto, '.atlas/state.json'), 'utf8'));
    assert.equal(manifest.template_version, '0.1.3');
    assert.equal(state.template_version, '0.1.3');
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
