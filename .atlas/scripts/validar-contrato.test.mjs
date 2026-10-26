// validar-contrato.test.mjs — pruebas del validador de contrato por host.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// El script tiene código de nivel superior y lee rutas relativas al proyecto, así
// que cada caso lo ejecuta como subproceso sobre una fixture temporal.
//
// Uso: node --test .atlas/scripts/validar-contrato.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RUTA_SCRIPT = join(RAIZ, '.atlas/scripts/validar-contrato.mjs');

const AGENTS = [
  '# AGENTS.md',
  '',
  '## Stacks',
  '',
  '| Stack | Profile |',
  '|---|---|',
  '| `node-scripts` | `.atlas/profiles/node-scripts.yaml` |',
  '',
  '## Skill Registry',
  '',
  '| Skill | Path |',
  '|---|---|',
  '| `demo` | `.agents/skills/demo/` |',
  '',
].join('\n');

const PERFIL = 'name: node-scripts\ndescription: demo\ncommands:\n  test: node --test\n';

async function escribir(raiz, rel, contenido) {
  const destino = join(raiz, rel);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido, 'utf8');
}

async function crearProyecto({ host, adaptadores = {}, opcionales = [], estadoExtra = {} } = {}) {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-contrato-'));
  await mkdir(join(raiz, '.atlas'), { recursive: true });
  await copyFile(join(RAIZ, '.atlas/PLACEHOLDERS.md'), join(raiz, '.atlas/PLACEHOLDERS.md'));
  await escribir(raiz, 'AGENTS.md', AGENTS);
  await mkdir(join(raiz, '.atlas/agents'), { recursive: true });
  await escribir(raiz, '.atlas/profiles/node-scripts.yaml', PERFIL);
  await escribir(raiz, '.agents/skills/demo/SKILL.md', '---\nname: demo\ndescription: demo\n---\n');
  await escribir(
    raiz,
    '.atlas/state.json',
    `${JSON.stringify(
      {
        status: 'configured',
        host,
        stacks: [{ id: 'node-scripts', profile: 'node-scripts' }],
        optional_agents: opcionales,
        ...estadoExtra,
      },
      null,
      2,
    )}\n`,
  );
  for (const [rel, contenido] of Object.entries(adaptadores)) {
    await escribir(raiz, rel, contenido);
  }
  return raiz;
}

function validar(raiz) {
  return spawnSync(process.execPath, [RUTA_SCRIPT], { cwd: raiz, encoding: 'utf8' });
}

test('un proyecto Cursor con el adaptador del stack y un rol opcional es válido', async () => {
  const raiz = await crearProyecto({
    host: 'cursor',
    opcionales: ['mentor'],
    adaptadores: {
      '.cursor/agents/engineer-node-scripts.md': '# engineer\n',
      '.cursor/agents/mentor.md': '# mentor\n',
    },
  });
  await escribir(
    raiz,
    '.atlas/agents/mentor.md',
    '<!-- optional-role --> # mentor\n\n> Teach the project concepts.\n',
  );
  try {
    const salida = validar(raiz);
    assert.equal(salida.status, 0, `stderr: ${salida.stderr}`);
    assert.match(salida.stdout, /✅ Todos los placeholders/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('un proyecto Cursor sin el adaptador del stack y con engineer.md es inválido', async () => {
  const raiz = await crearProyecto({
    host: 'cursor',
    adaptadores: { '.cursor/agents/engineer.md': '# engineer\n' },
  });
  try {
    const salida = validar(raiz);
    assert.equal(salida.status, 1);
    assert.match(salida.stderr, /\.cursor\/agents\/engineer-node-scripts\.md: falta el adaptador del stack/);
    assert.match(salida.stderr, /\.cursor\/agents\/engineer\.md: adaptador obsoleto/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
