// githooks.test.mjs — pruebas de los hooks de git del arnés.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Cada caso monta un repositorio temporal con `git init` y apunta `core.hooksPath`
// a los hooks del template, para ejercitar el comportamiento real de git. Los
// ejecutables de git se resuelven por PATH: se usa un PATH mínimo con un doble de
// `gitleaks` para que el resultado no dependa de la máquina.
//
// Uso: node --test .atlas/scripts/githooks.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HOOKS = join(RAIZ, '.githooks');

async function escribir(ruta, contenido) {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido, 'utf8');
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// PATH mínimo y determinista: git por symlink y un doble de gitleaks que no
// escanea nada. Sin doble, `command -v gitleaks` falla y el hook avisa.
async function crearBin(raiz, { gitleaks = true } = {}) {
  const bin = join(raiz, 'bin');
  await mkdir(bin, { recursive: true });
  await symlink(execFileSync('which', ['git'], { encoding: 'utf8' }).trim(), join(bin, 'git'));
  if (gitleaks) {
    const ruta = join(bin, 'gitleaks');
    await writeFile(
      ruta,
      '#!/bin/sh\n[ -n "$GITLEAKS_MARKER" ] && echo run >> "$GITLEAKS_MARKER"\nexit 0\n',
      'utf8',
    );
    await chmod(ruta, 0o755);
  }
  return bin;
}

// `commits: false` deja el repositorio en la rama inicial sin ningún commit.
async function crearRepo(raiz, { rama = 'main', commits = true } = {}) {
  const repo = join(raiz, 'repo');
  await mkdir(repo, { recursive: true });
  git(repo, ['init', '--quiet']);
  git(repo, ['symbolic-ref', 'HEAD', `refs/heads/${rama}`]);
  git(repo, ['config', 'user.name', 'Hooks Test']);
  git(repo, ['config', 'user.email', 'hooks@example.test']);
  if (commits) {
    await escribir(join(repo, 'README.md'), '# repo\n');
    git(repo, ['add', 'README.md']);
    git(repo, ['commit', '--quiet', '--no-verify', '-m', 'chore: base']);
  }
  return repo;
}

async function activarHooks(repo, hooks = HOOKS) {
  git(repo, ['config', 'core.hooksPath', hooks]);
}

function intentarCommit(repo, mensaje, env) {
  return spawnSync('git', ['commit', '-m', mensaje], {
    cwd: repo,
    encoding: 'utf8',
    env: env ?? process.env,
  });
}

const salida = (resultado) => `${resultado.stdout ?? ''}${resultado.stderr ?? ''}`;

async function prepararRepoConHooks(raiz, opciones) {
  const repo = await crearRepo(raiz, opciones);
  await activarHooks(repo);
  return repo;
}

async function crearHooksTemporales(raiz, guards) {
  const hooks = join(raiz, 'hooks');
  await mkdir(join(hooks, 'pre-commit.d'), { recursive: true });
  await copyFile(join(HOOKS, 'pre-commit'), join(hooks, 'pre-commit'));
  await chmod(join(hooks, 'pre-commit'), 0o755);
  for (const [nombre, contenido] of Object.entries(guards)) {
    const ruta = join(hooks, 'pre-commit.d', nombre);
    await writeFile(ruta, contenido, 'utf8');
    await chmod(ruta, 0o755);
  }
  return hooks;
}

const guardMarca = (marca, codigo = 0) =>
  `#!/bin/sh\n: > "$MARKER_DIR/${marca}"\nexit ${codigo}\n`;

test('sin commits: el guard no bloquea el primer commit y avisa', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz, { commits: false });
    await escribir(join(repo, 'README.md'), '# repo\n');
    git(repo, ['add', 'README.md']);

    const resultado = intentarCommit(repo, 'chore: primer commit', { ...process.env, PATH: bin });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.match(salida(resultado), /no commits yet/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('rama base con artefactos de change: bloquea y propone el worktree del change', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz);
    await escribir(join(repo, 'openspec/changes/demo/proposal.md'), '# Proposal\n');
    git(repo, ['add', 'openspec/changes/demo/proposal.md']);

    const resultado = intentarCommit(repo, 'docs: proposal', { ...process.env, PATH: bin });

    assert.notEqual(resultado.status, 0);
    const texto = salida(resultado);
    assert.match(texto, /base branch 'main'/i);
    assert.match(texto, /git worktree add \.worktrees\/demo -b feature\/demo/);
    assert.match(texto, /cd \.worktrees\/demo/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('rama base con otro cambio: bloquea y pide rama y pull request', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz);
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', { ...process.env, PATH: bin });

    assert.notEqual(resultado.status, 0);
    const texto = salida(resultado);
    assert.match(texto, /feature branch/i);
    assert.match(texto, /pull request/i);
    assert.doesNotMatch(texto, /git worktree add/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('rama de feature: el guard no interviene', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz);
    git(repo, ['checkout', '-b', 'feature/demo']);
    await escribir(join(repo, 'openspec/changes/demo/proposal.md'), '# Proposal\n');
    git(repo, ['add', 'openspec/changes/demo/proposal.md']);

    const resultado = intentarCommit(repo, 'docs: proposal', { ...process.env, PATH: bin });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.doesNotMatch(salida(resultado), /Commit blocked/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('rama de feature en un worktree: el guard no interviene', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz);
    const worktree = join(raiz, 'wt');
    git(repo, ['worktree', 'add', worktree, '-b', 'feature/wt']);
    await escribir(join(worktree, 'src/app.js'), 'export const ok = true;\n');
    git(worktree, ['add', 'src/app.js']);

    const resultado = intentarCommit(worktree, 'feat: app', { ...process.env, PATH: bin });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.doesNotMatch(salida(resultado), /Commit blocked/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('HEAD detached: el guard no interviene y avisa', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz);
    git(repo, ['checkout', '--quiet', '--detach']);
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', { ...process.env, PATH: bin });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.match(salida(resultado), /detached HEAD/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('rama base indeterminable: no bloquea y avisa', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const repo = await prepararRepoConHooks(raiz, { rama: 'topic' });
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', { ...process.env, PATH: bin });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.match(salida(resultado), /could not determine the base branch/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('herramienta de secretos ausente: el guard igual bloquea en la rama base', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz, { gitleaks: false });
    const repo = await prepararRepoConHooks(raiz);
    await escribir(join(repo, 'openspec/changes/demo/proposal.md'), '# Proposal\n');
    git(repo, ['add', 'openspec/changes/demo/proposal.md']);

    const resultado = intentarCommit(repo, 'docs: proposal', { ...process.env, PATH: bin });

    assert.notEqual(resultado.status, 0);
    assert.match(salida(resultado), /git worktree add \.worktrees\/demo/);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('guard de secretos: si la herramienta falta, avisa y sale con 0', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz, { gitleaks: false });
    const resultado = spawnSync(join(HOOKS, 'pre-commit.d/20-gitleaks.sh'), [], {
      encoding: 'utf8',
      env: { ...process.env, PATH: bin },
    });

    assert.equal(resultado.status, 0);
    assert.match(salida(resultado), /not installed/i);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('despachador: aborta en el primer fallo y no ejecuta el segundo', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const marca = join(raiz, 'marca');
    await mkdir(marca);
    const hooks = await crearHooksTemporales(raiz, {
      '10-falla.sh': guardMarca('10', 1),
      '20-no-debe.sh': guardMarca('20', 0),
    });
    const repo = await crearRepo(raiz);
    await activarHooks(repo, hooks);
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', {
      ...process.env,
      PATH: bin,
      MARKER_DIR: marca,
    });

    assert.notEqual(resultado.status, 0);
    assert.match(salida(resultado), /10-falla\.sh/);
    assert.deepEqual(await readdir(marca), ['10']);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('despachador: si todos los guards pasan, el commit continúa', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const marca = join(raiz, 'marca');
    await mkdir(marca);
    const hooks = await crearHooksTemporales(raiz, {
      '10-ok.sh': guardMarca('10', 0),
      '20-ok.sh': guardMarca('20', 0),
    });
    const repo = await crearRepo(raiz);
    await activarHooks(repo, hooks);
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', {
      ...process.env,
      PATH: bin,
      MARKER_DIR: marca,
    });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.deepEqual(await readdir(marca), ['10', '20']);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('despachador: un guard nuevo se ejecuta sin editar el despachador', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const marca = join(raiz, 'marca');
    await mkdir(marca);
    const hooks = await crearHooksTemporales(raiz, { '30-nuevo.sh': guardMarca('30', 0) });
    const repo = await crearRepo(raiz);
    await activarHooks(repo, hooks);
    await escribir(join(repo, 'src/app.js'), 'export const ok = true;\n');
    git(repo, ['add', 'src/app.js']);

    const resultado = intentarCommit(repo, 'feat: app', {
      ...process.env,
      PATH: bin,
      MARKER_DIR: marca,
    });

    assert.equal(resultado.status, 0, salida(resultado));
    assert.deepEqual(await readdir(marca), ['30']);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('el despachador ejecuta el guard antes que el escaneo de secretos', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'atlas-githooks-'));
  try {
    const bin = await crearBin(raiz);
    const marca = join(raiz, 'gitleaks-marca');
    const repo = await prepararRepoConHooks(raiz);
    await escribir(join(repo, 'openspec/changes/demo/proposal.md'), '# Proposal\n');
    git(repo, ['add', 'openspec/changes/demo/proposal.md']);

    const bloqueado = intentarCommit(repo, 'docs: proposal', {
      ...process.env,
      PATH: bin,
      GITLEAKS_MARKER: marca,
    });

    assert.notEqual(bloqueado.status, 0);
    await assert.rejects(readFile(marca), { code: 'ENOENT' });

    git(repo, ['reset', '--quiet']);
    git(repo, ['checkout', '-b', 'feature/demo']);
    await escribir(join(repo, 'openspec/changes/demo/proposal.md'), '# Proposal\n');
    git(repo, ['add', 'openspec/changes/demo/proposal.md']);
    const permitido = intentarCommit(repo, 'docs: proposal', {
      ...process.env,
      PATH: bin,
      GITLEAKS_MARKER: marca,
    });

    assert.equal(permitido.status, 0, salida(permitido));
    assert.equal(await readFile(marca, 'utf8'), 'run\n');
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});
