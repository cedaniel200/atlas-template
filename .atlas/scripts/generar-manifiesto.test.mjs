// generar-manifiesto.test.mjs — pruebas del generador de manifiesto.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// El script tiene código de nivel superior, así que cada caso lo ejecuta como
// subproceso sobre una fixture temporal.
//
// Uso: node --test .atlas/scripts/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUTA_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), 'generar-manifiesto.mjs');

const CONTENIDO = {
  'AGENTS.md': '# AGENTS.md\n',
  'docs/guide.md': '# Guía\n',
  '.atlas/README.md': '# .atlas/\n',
  '.atlas/scripts/demo.mjs': "console.log('demo');\n",
  '.atlas/agents/demo.md': '# Agente de ejemplo\n',
  '.opencode/agent/demo.md': '# Adaptador de ejemplo\n',
};

const ESPERADO = {
  'AGENTS.md': { ownership: 'owned', origin: 'core' },
  'docs/guide.md': { ownership: 'owned', origin: 'core' },
  '.atlas/README.md': { ownership: 'managed', origin: 'core' },
  '.atlas/scripts/demo.mjs': { ownership: 'managed', origin: 'core' },
  '.atlas/agents/demo.md': { ownership: 'managed', origin: 'core' },
  '.opencode/agent/demo.md': { ownership: 'generated', origin: 'host:opencode' },
};

const ESTADO = { host: 'opencode', template_version: '0.1.2' };

async function crearFixture({ contenido = CONTENIDO, estado = ESTADO } = {}) {
  const fixture = await mkdtemp(join(tmpdir(), 'generar-manifiesto-'));
  for (const [rel, texto] of Object.entries(contenido)) {
    const destino = join(fixture, rel);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, texto, 'utf8');
  }
  await mkdir(join(fixture, '.atlas'), { recursive: true });
  await writeFile(join(fixture, '.atlas/state.json'), `${JSON.stringify(estado)}\n`, 'utf8');
  // Manifiesto de una ejecución anterior: el generador no debe inventariarlo.
  await writeFile(join(fixture, '.atlas/manifest.json'), '{"files":{}}\n', 'utf8');
  return fixture;
}

function generar(fixture, host = 'opencode') {
  execFileSync(process.execPath, [RUTA_SCRIPT, '--project', fixture, '--host', host], {
    stdio: 'pipe',
  });
  return readFile(join(fixture, '.atlas/manifest.json'), 'utf8').then(JSON.parse);
}

async function afirmarEntrada(manifest, fixture, rel, esperado) {
  const entrada = manifest.files[rel];
  assert.ok(entrada, `${rel} debe inventariarse`);
  assert.equal(entrada.ownership, esperado.ownership, `ownership de ${rel}`);
  assert.equal(entrada.origin, esperado.origin, `origin de ${rel}`);

  assert.match(entrada.sha256, /^[0-9a-f]{64}$/, `formato de sha256 de ${rel}`);
  // Cálculo independiente del de producción.
  const sha256 = createHash('sha256').update(await readFile(join(fixture, rel))).digest('hex');
  assert.equal(entrada.sha256, sha256, `sha256 de ${rel}`);
}

test('sin lib/inventario.mjs falla con un mensaje accionable y sin stack de import', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'generar-manifiesto-sin-lib-'));
  const aislado = join(raiz, 'scripts');
  const fixture = await crearFixture();
  try {
    // Copia aislada del script, sin el `lib/` hermano: reproduce el proyecto
    // que actualizó los scripts pero no llegó a adoptar el módulo.
    await mkdir(aislado, { recursive: true });
    await copyFile(RUTA_SCRIPT, join(aislado, 'generar-manifiesto.mjs'));

    const salida = spawnSync(
      process.execPath,
      [join(aislado, 'generar-manifiesto.mjs'), '--project', fixture, '--host', 'opencode'],
      { encoding: 'utf8' },
    );

    assert.equal(salida.status, 1);
    assert.match(salida.stderr, /falta \.atlas\/scripts\/lib\/inventario\.mjs/);
    assert.match(salida.stderr, /actualizar-arnes\.mjs --template <ruta del template>/);
    assert.ok(!/ERR_MODULE_NOT_FOUND/.test(salida.stderr), 'no debe filtrar el stack del import');
  } finally {
    await rm(fixture, { recursive: true, force: true });
    await rm(raiz, { recursive: true, force: true });
  }
});

test('clasifica scripts y README de .atlas como managed core', async () => {
  const fixture = await crearFixture();
  try {
    const manifest = await generar(fixture);

    assert.deepEqual(Object.keys(manifest.files).sort(), Object.keys(ESPERADO).sort());
    assert.ok(!('.atlas/state.json' in manifest.files), 'state.json no debe inventariarse');
    assert.ok(!('.atlas/manifest.json' in manifest.files), 'manifest.json no debe inventariarse');

    for (const [rel, esperado] of Object.entries(ESPERADO)) {
      await afirmarEntrada(manifest, fixture, rel, esperado);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('clasifica .githooks como managed core', async () => {
  const fixture = await crearFixture({
    contenido: {
      ...CONTENIDO,
      '.githooks/pre-commit': '#!/bin/sh\n',
      '.githooks/pre-commit.d/10-worktree-guard.sh': '#!/bin/sh\n',
    },
  });
  try {
    const manifest = await generar(fixture);

    for (const rel of ['.githooks/pre-commit', '.githooks/pre-commit.d/10-worktree-guard.sh']) {
      await afirmarEntrada(manifest, fixture, rel, { ownership: 'managed', origin: 'core' });
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('inventaría la raíz de documentación configurada en state.docs.root', async () => {
  const contenido = {
    'documentation/README.md': '# Documentación\n',
    'documentation/project-context.md': '# Contexto del proyecto\n',
    'documentation/architecture/README.md': '# Arquitectura\n',
    'documentation/harness/en/QUICKSTART.md': '# Inicio rápido\n',
    // Señuelo: con `docs/` fijo en la regla, este archivo se colaría en el manifiesto.
    'docs/legacy.md': '# Documentación heredada\n',
  };
  const estado = {
    ...ESTADO,
    docs: {
      root: 'documentation',
      functional: null,
      architecture: 'documentation/architecture',
      api: null,
      guides: null,
      bilingual: false,
    },
  };
  const fixture = await crearFixture({ contenido, estado });
  try {
    const manifest = await generar(fixture);

    for (const rel of Object.keys(contenido).filter((ruta) => ruta.startsWith('documentation/'))) {
      await afirmarEntrada(manifest, fixture, rel, { ownership: 'owned', origin: 'core' });
    }
    assert.ok(!('docs/legacy.md' in manifest.files), 'docs/ no debe inventariarse con otra raíz');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('la raíz de documentación explícita `docs` se comporta como el valor por defecto', async () => {
  const estado = {
    ...ESTADO,
    docs: {
      root: 'docs',
      functional: 'docs/functional',
      architecture: null,
      api: null,
      guides: null,
      bilingual: false,
    },
  };
  const fixture = await crearFixture({ estado });
  try {
    const manifest = await generar(fixture);

    await afirmarEntrada(manifest, fixture, 'docs/guide.md', {
      ownership: 'owned',
      origin: 'core',
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('escapa los metacaracteres de la raíz de documentación', async () => {
  const contenido = {
    'doc.v1/guide.md': '# Guía\n',
    // Señuelo: un patrón sin escapar (`^doc.v1/`) también lo capturaría.
    'docXv1/guide.md': '# Guía ajena\n',
  };
  const estado = {
    ...ESTADO,
    docs: {
      root: 'doc.v1',
      functional: null,
      architecture: null,
      api: null,
      guides: null,
      bilingual: false,
    },
  };
  const fixture = await crearFixture({ contenido, estado });
  try {
    const manifest = await generar(fixture);

    await afirmarEntrada(manifest, fixture, 'doc.v1/guide.md', {
      ownership: 'owned',
      origin: 'core',
    });
    assert.ok(!('docXv1/guide.md' in manifest.files), 'solo la raíz exacta debe inventariarse');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('un proyecto Cursor clasifica adaptadores y comandos y deja fuera mcp.json', async () => {
  const contenido = {
    '.cursor/agents/reviewer.md': '# reviewer\n',
    '.cursor/commands/opsx-apply.md': '# opsx-apply\n',
    '.cursor/mcp.json': '{ "mcpServers": {} }\n',
  };
  const fixture = await crearFixture({
    contenido,
    estado: { host: 'cursor', template_version: '0.1.2' },
  });
  try {
    const manifest = await generar(fixture, 'cursor');

    assert.deepEqual(Object.keys(manifest.files).sort(), [
      '.cursor/agents/reviewer.md',
      '.cursor/commands/opsx-apply.md',
    ]);
    for (const rel of Object.keys(manifest.files)) {
      await afirmarEntrada(manifest, fixture, rel, {
        ownership: 'generated',
        origin: 'host:cursor',
      });
    }
    assert.ok(
      !('.cursor/mcp.json' in manifest.files),
      'la configuración MCP del usuario no debe entrar en el manifiesto',
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('el error de host enumera Cursor entre las opciones', async () => {
  const fixture = await crearFixture({ estado: { template_version: '0.1.2' } });
  try {
    const salida = spawnSync(process.execPath, [RUTA_SCRIPT, '--project', fixture], {
      encoding: 'utf8',
    });

    assert.equal(salida.status, 1);
    assert.match(salida.stderr, /pasa --host opencode\|claude\|cursor\|codex/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
