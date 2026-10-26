// actualizar-arnes.test.mjs — pruebas del actualizador del arnés.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Uso: node --test .atlas/scripts/actualizar-arnes.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
const NUEVO = '#!/usr/bin/env node\n// Script managed que solo existe en el template nuevo.\n';
const NUEVO_LOCAL = '// versión local sin seguimiento en el manifiesto\n';
// Módulo nuevo de la versión: un proyecto < 0.3.0 no lo tiene y el updater
// anterior no adoptaba archivos, así que el primer salto debe resolverlo desde
// el template que se aplica.
const INVENTARIO = '// inventario del template nuevo\nexport async function inventariar() {\n  return {};\n}\n';
const RUTA_INVENTARIO = '.atlas/scripts/lib/inventario.mjs';

async function crearProyecto(raiz, archivosExtra = {}) {
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
          ...archivosExtra,
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

async function crearTemplateConArchivos(raiz, archivos = {}) {
  const template = await crearTemplate(raiz);
  for (const [rel, contenido] of Object.entries(archivos)) {
    await escribir(join(template, rel), contenido);
  }
  return template;
}

const leerManifiesto = async (proyecto) =>
  JSON.parse(await readFile(join(proyecto, '.atlas/manifest.json'), 'utf8'));

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

test('adopta un archivo managed que solo existe en el template nuevo', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { '.atlas/scripts/nuevo.mjs': NUEVO });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.nuevos, ['.atlas/scripts/nuevo.mjs']);
    assert.equal(await readFile(join(proyecto, '.atlas/scripts/nuevo.mjs'), 'utf8'), NUEVO);
    const manifest = await leerManifiesto(proyecto);
    assert.deepEqual(manifest.files['.atlas/scripts/nuevo.mjs'], {
      origin: 'core',
      ownership: 'managed',
      sha256: sha256(NUEVO),
    });
    assert.deepEqual(resultado.errores, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('la adopción es idempotente: la segunda ejecución no reporta nuevos', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { '.atlas/scripts/nuevo.mjs': NUEVO });

    await actualizarArnes({ template, proyecto, log: () => {} });
    const segunda = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(segunda.nuevos, []);
    assert.ok(segunda.sinCambios.includes('.atlas/scripts/nuevo.mjs'));
    assert.equal(await readFile(join(proyecto, '.atlas/scripts/nuevo.mjs'), 'utf8'), NUEVO);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('un archivo managed nuevo que ya existe sin seguimiento genera .new y conflicto', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { '.atlas/scripts/nuevo.mjs': NUEVO });
    await escribir(join(proyecto, '.atlas/scripts/nuevo.mjs'), NUEVO_LOCAL);

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.nuevos, []);
    assert.deepEqual(resultado.conflictos, ['.atlas/scripts/nuevo.mjs']);
    assert.equal(await readFile(join(proyecto, '.atlas/scripts/nuevo.mjs'), 'utf8'), NUEVO_LOCAL);
    assert.equal(await readFile(join(proyecto, '.atlas/scripts/nuevo.mjs.new'), 'utf8'), NUEVO);
    const manifest = await leerManifiesto(proyecto);
    assert.deepEqual(manifest.files['.atlas/scripts/nuevo.mjs'], {
      origin: 'core',
      ownership: 'managed',
      sha256: sha256(NUEVO),
    });
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('no adopta archivos owned aunque solo existan en el template nuevo', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { 'docs/extra.md': '# Extra\n' });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.nuevos, []);
    assert.ok(!resultado.conflictos.includes('docs/extra.md'));
    await assert.rejects(readFile(join(proyecto, 'docs/extra.md')), { code: 'ENOENT' });
    const manifest = await leerManifiesto(proyecto);
    assert.equal(manifest.files['docs/extra.md'], undefined);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('primer salto: adopta lib/inventario.mjs desde el template aunque el proyecto no lo tenga', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { [RUTA_INVENTARIO]: INVENTARIO });

    // El proyecto usa la forma previa a 0.3.0: ni el archivo ni la entrada
    // del manifiesto existen, y aun así la actualización debe completarse.
    await assert.rejects(readFile(join(proyecto, RUTA_INVENTARIO)), { code: 'ENOENT' });
    assert.equal(await leerManifiesto(proyecto).then((m) => m.files[RUTA_INVENTARIO]), undefined);

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.nuevos, [RUTA_INVENTARIO]);
    assert.equal(await readFile(join(proyecto, RUTA_INVENTARIO), 'utf8'), INVENTARIO);
    assert.deepEqual((await leerManifiesto(proyecto)).files[RUTA_INVENTARIO], {
      origin: 'core',
      ownership: 'managed',
      sha256: sha256(INVENTARIO),
    });
    assert.deepEqual(resultado.errores, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('primer salto: la segunda ejecución usa la copia local y no reporta nuevos', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { [RUTA_INVENTARIO]: INVENTARIO });

    await actualizarArnes({ template, proyecto, log: () => {} });
    const segunda = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(segunda.nuevos, []);
    assert.ok(segunda.sinCambios.includes(RUTA_INVENTARIO));
    assert.deepEqual(segunda.errores, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('--dry-run reporta la adopción sin escribir archivos ni manifiesto', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, { '.atlas/scripts/nuevo.mjs': NUEVO });

    const resultado = await actualizarArnes({ template, proyecto, dryRun: true, log: () => {} });

    assert.deepEqual(resultado.nuevos, ['.atlas/scripts/nuevo.mjs']);
    await assert.rejects(readFile(join(proyecto, '.atlas/scripts/nuevo.mjs')), { code: 'ENOENT' });
    const manifest = await leerManifiesto(proyecto);
    assert.equal(manifest.files['.atlas/scripts/nuevo.mjs'], undefined);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

const HOOK = '#!/bin/sh\n# hook del arnés\nexit 0\n';
const HOOK_LOCAL = '#!/bin/sh\n# hook local modificado\nexit 0\n';
const GUARD = '#!/bin/sh\nexit 0\n';

test('un proyecto anterior sin .githooks/ adopta los hooks y avisa cómo activarlos', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    const template = await crearTemplateConArchivos(raiz, {
      '.githooks/pre-commit': HOOK,
      '.githooks/pre-commit.d/10-worktree-guard.sh': GUARD,
    });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.nuevos, [
      '.githooks/pre-commit',
      '.githooks/pre-commit.d/10-worktree-guard.sh',
    ]);
    assert.equal(await readFile(join(proyecto, '.githooks/pre-commit'), 'utf8'), HOOK);
    const manifest = await leerManifiesto(proyecto);
    assert.deepEqual(manifest.files['.githooks/pre-commit'], {
      origin: 'core',
      ownership: 'managed',
      sha256: sha256(HOOK),
    });
    assert.match(resultado.avisos[0], /git config core\.hooksPath \.githooks/);
    assert.deepEqual(resultado.errores, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('un hook local modificado genera .new y copia de seguridad', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz, {
      '.githooks/pre-commit': {
        ownership: 'managed',
        origin: 'core',
        sha256: sha256(HOOK),
      },
    });
    await escribir(join(proyecto, '.githooks/pre-commit'), HOOK_LOCAL);
    const template = await crearTemplateConArchivos(raiz, { '.githooks/pre-commit': HOOK });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.deepEqual(resultado.conflictos, ['.githooks/pre-commit']);
    assert.equal(await readFile(join(proyecto, '.githooks/pre-commit'), 'utf8'), HOOK_LOCAL);
    assert.equal(await readFile(join(proyecto, '.githooks/pre-commit.new'), 'utf8'), HOOK);
    const backups = await readdir(join(proyecto, '.atlas/backups'));
    assert.equal(backups.length, 1);
    assert.equal(
      await readFile(join(proyecto, '.atlas/backups', backups[0], '.githooks/pre-commit'), 'utf8'),
      HOOK_LOCAL,
    );
    assert.deepEqual((await leerManifiesto(proyecto)).files['.githooks/pre-commit'], {
      origin: 'core',
      ownership: 'managed',
      sha256: sha256(HOOK),
    });
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('si core.hooksPath ya es .githooks no avisa', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = await crearProyecto(raiz);
    execFileSync('git', ['init', '--quiet'], { cwd: proyecto });
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: proyecto });
    const template = await crearTemplateConArchivos(raiz, { '.githooks/pre-commit': HOOK });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    assert.ok(resultado.nuevos.includes('.githooks/pre-commit'));
    assert.deepEqual(resultado.avisos, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

const AGENTS_MINIMO = [
  '# AGENTS.md',
  '',
  '| Placeholder | Value |',
  '|---|---|',
  '| `TEST_COMMAND` | `node --test` |',
  '',
].join('\n');

test('con host cursor regenera los adaptadores y conserva .cursor/mcp.json', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-actualizar-'));
  try {
    const proyecto = join(raiz, 'proyecto');
    await escribir(
      join(proyecto, '.atlas/state.json'),
      `${JSON.stringify(
        {
          status: 'configured',
          host: 'cursor',
          stacks: [],
          optional_agents: [],
          template_version: '0.1.2',
        },
        null,
        2,
      )}\n`,
    );
    await escribir(join(proyecto, 'AGENTS.md'), AGENTS_MINIMO);
    await escribir(
      join(proyecto, '.atlas/manifest.json'),
      `${JSON.stringify({ template_version: '0.1.2', generated_at: null, files: {} }, null, 2)}\n`,
    );
    const MCP = '{"mcpServers":{"propio":{"url":"https://example.test/mcp"}}}\n';
    await escribir(join(proyecto, '.cursor/mcp.json'), MCP);

    const template = await crearTemplateConArchivos(raiz, {
      '.atlas/agents/demo.md': '# demo\n\n> **Exclusive role:** demo the cursor adapter.\n',
    });

    const resultado = await actualizarArnes({ template, proyecto, log: () => {} });

    const adaptador = await readFile(join(proyecto, '.cursor/agents/demo.md'), 'utf8');
    assert.match(adaptador, /^---\nname: demo\ndescription: /);
    assert.match(adaptador, /^model: inherit$/m);
    assert.ok(!/^readonly:/m.test(adaptador), 'Cursor no debe restringir la escritura por rol');
    assert.equal(
      await readFile(join(proyecto, '.cursor/mcp.json'), 'utf8'),
      MCP,
      'la configuración MCP del usuario no se toca',
    );
    assert.deepEqual(resultado.errores, []);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
