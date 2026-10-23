// renderizar-adaptadores.test.mjs — pruebas del renderizador de adaptadores.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Uso: node --test .atlas/scripts/renderizar-adaptadores.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderizarAdaptadores } from './renderizar-adaptadores.mjs';

// El script vive en `.atlas/scripts/`: dos niveles arriba está la raíz del template.
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const AGENTS_MINIMO = [
  '# AGENTS.md',
  '',
  '| Placeholder | Value |',
  '|---|---|',
  '| `TEST_COMMAND` | `node --test` |',
  '',
].join('\n');

// Descripción esperada calculada sin usar el código de producción: primer bloque
// de líneas consecutivas que empiezan por `>`, unidas por un espacio.
function descripcionEsperada(cuerpo) {
  const lineas = cuerpo.split('\n');
  const inicio = lineas.findIndex((linea) => linea.startsWith('>'));
  if (inicio === -1) return null;
  const partes = [];
  for (let i = inicio; i < lineas.length && lineas[i].startsWith('>'); i += 1) {
    partes.push(lineas[i].replace(/^>\s?/, ''));
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

// Lee el valor YAML de la primera línea `<campo>:` del frontmatter y desescapa la
// comilla simple duplicada (`''` → `'`).
function leerDescripcion(contenido, campo = 'description') {
  const linea = contenido.split('\n').find((actual) => actual.startsWith(`${campo}:`));
  assert.ok(linea, `sin frontmatter para ${campo}`);
  return linea;
}

function valorEntrecomillado(linea, campo = 'description') {
  const prefijo = `${campo}: '`;
  assert.ok(linea.startsWith(prefijo), `la línea no empieza entrecomillada: ${linea}`);
  assert.ok(linea.endsWith("'"), `la línea no cierra la comilla: ${linea}`);
  return linea.slice(prefijo.length, -1).replace(/''/g, "'");
}

async function crearProyecto({ agentsMd, state, template }) {
  const proyecto = await mkdtemp(join(tmpdir(), 'atlas-adaptadores-'));
  await mkdir(join(proyecto, '.atlas'), { recursive: true });
  await writeFile(join(proyecto, 'AGENTS.md'), agentsMd, 'utf8');
  await writeFile(join(proyecto, '.atlas/state.json'), JSON.stringify(state, null, 2), 'utf8');
  return { proyecto, template };
}

async function crearTemplateSintetico(agentes) {
  const template = await mkdtemp(join(tmpdir(), 'atlas-template-'));
  const directorio = join(template, '.atlas/agents');
  await mkdir(directorio, { recursive: true });
  for (const [nombre, cuerpo] of Object.entries(agentes)) {
    await writeFile(join(directorio, `${nombre}.md`), cuerpo, 'utf8');
  }
  return template;
}

async function conFixture(opciones, prueba) {
  const fixture = await crearProyecto(opciones);
  try {
    await prueba(fixture);
  } finally {
    await rm(fixture.proyecto, { recursive: true, force: true });
    if (fixture.template !== RAIZ) await rm(fixture.template, { recursive: true, force: true });
  }
}

test('integración: el adaptador conserva el bloque de cita completo del prompt canónico', async () => {
  const agentsMd = (await readFile(join(RAIZ, 'AGENTS.md'), 'utf8')).replace(/\{\{[A-Z0-9_]+\}\}/g, 'resuelto');
  const state = { host: 'opencode', stacks: [{ id: 'node-scripts' }], optional_agents: [] };

  await conFixture({ agentsMd, state, template: RAIZ }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template: RAIZ, proyecto, log: () => {} });

    for (const [rol, archivo] of [
      ['doc-writer', 'doc-writer.md'],
      ['engineer', 'engineer-node-scripts.md'],
      ['reviewer', 'reviewer.md'],
    ]) {
      const canonico = await readFile(join(RAIZ, '.atlas/agents', `${rol}.md`), 'utf8');
      const esperado = descripcionEsperada(canonico);
      assert.ok(esperado, `${rol}: el prompt canónico no tiene bloque de cita`);

      const renderizado = await readFile(join(proyecto, '.opencode/agent', archivo), 'utf8');
      const linea = leerDescripcion(renderizado);
      const valor = valorEntrecomillado(linea);
      const sufijo = rol === 'engineer' ? ' — node-scripts' : '';
      assert.equal(valor, `${esperado}${sufijo}`, `${archivo}: descripción truncada`);
    }
  });
});

test('integración: las líneas de continuación del bloque no se pierden', async () => {
  const agentsMd = (await readFile(join(RAIZ, 'AGENTS.md'), 'utf8')).replace(/\{\{[A-Z0-9_]+\}\}/g, 'resuelto');
  const state = { host: 'opencode', stacks: [{ id: 'node-scripts' }], optional_agents: [] };

  await conFixture({ agentsMd, state, template: RAIZ }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template: RAIZ, proyecto, log: () => {} });

    // Fragmentos que hoy se cortan: antes de la corrección la descripción acaba
    // en la primera línea del bloque.
    const esperados = {
      'doc-writer.md': 'change, the ADRs and the code.',
      'engineer-node-scripts.md': "tests with TDD, following the project's architecture and security practices.",
      'reviewer.md': 'security (OWASP) and engineering quality.',
    };
    for (const [archivo, fragmento] of Object.entries(esperados)) {
      const renderizado = await readFile(join(proyecto, '.opencode/agent', archivo), 'utf8');
      const valor = valorEntrecomillado(leerDescripcion(renderizado));
      assert.ok(valor.startsWith('**Exclusive role:**'), `${archivo}: descripción inesperada`);
      assert.ok(valor.includes(fragmento), `${archivo}: falta "${fragmento}" (valor: ${valor})`);
    }
  });
});

test('la descripción se emite como escalar YAML entrecomillado con comillas escapadas', async () => {
  const template = await crearTemplateSintetico({
    narrador: [
      '# narrador',
      '',
      "> **Exclusive role:** keep the project's notes aligned with the approved",
      '> change, the ADRs and the code.',
      '',
      'Cuerpo del rol.',
      '',
    ].join('\n'),
    'sin-bloque': ['# sin-bloque', '', 'Cuerpo sin bloque de cita.', ''].join('\n'),
  });
  const state = { host: 'opencode', stacks: [], optional_agents: [] };

  await conFixture({ agentsMd: AGENTS_MINIMO, state, template }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const renderizado = await readFile(join(proyecto, '.opencode/agent/narrador.md'), 'utf8');
    const linea = leerDescripcion(renderizado);
    assert.ok(linea.includes("project''s"), `comilla sin escapar: ${linea}`);
    assert.equal(
      valorEntrecomillado(linea),
      "**Exclusive role:** keep the project's notes aligned with the approved change, the ADRs and the code.",
    );

    const vacio = await readFile(join(proyecto, '.opencode/agent/sin-bloque.md'), 'utf8');
    const lineas = vacio.split('\n');
    assert.equal(lineas[1], "description: 'Rol sin-bloque del arnés'");
  });
});

test('el host claude también entrecomilla la descripción', async () => {
  const template = await crearTemplateSintetico({
    narrador: [
      '# narrador',
      '',
      "> **Exclusive role:** keep the project's notes aligned.",
      '> Second line.',
      '',
    ].join('\n'),
  });
  const state = { host: 'claude', stacks: [], optional_agents: [] };

  await conFixture({ agentsMd: AGENTS_MINIMO, state, template }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const renderizado = await readFile(join(proyecto, '.claude/agents/narrador.md'), 'utf8');
    const linea = leerDescripcion(renderizado);
    assert.ok(linea.includes("project''s"), `comilla sin escapar: ${linea}`);
    assert.equal(
      valorEntrecomillado(linea),
      "**Exclusive role:** keep the project's notes aligned. Second line.",
    );
  });
});
