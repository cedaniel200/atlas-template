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

// Cálculo independiente del de producción: une el primer bloque de líneas
// consecutivas que empiezan por `>` y devuelve su primera oración (hasta el
// primer `.` seguido de espacio o fin de texto).
function bloqueDeCita(cuerpo) {
  const lineas = cuerpo.split('\n');
  const inicio = lineas.findIndex((linea) => linea.startsWith('>'));
  if (inicio === -1) return null;
  const partes = [];
  for (let i = inicio; i < lineas.length && lineas[i].startsWith('>'); i += 1) {
    partes.push(lineas[i].replace(/^>\s?/, ''));
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

function primeraOracion(texto) {
  const oracion = texto.match(/^[\s\S]*?\.(?=\s|$)/);
  return (oracion ? oracion[0] : texto).trim();
}

// Lee la línea `<campo>:` del frontmatter y desescapa la comilla simple
// duplicada (`''` → `'`).
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

function agentsMdReal() {
  return readFile(join(RAIZ, 'AGENTS.md'), 'utf8').then((texto) =>
    texto.replace(/\{\{[A-Z0-9_]+\}\}/g, 'resuelto'),
  );
}

// Los tres adaptadores cuyos prompts canónicos declaran `**Exclusive role:**` y
// que el host muestra en el selector de agentes.
const CASOS = [
  {
    rol: 'doc-writer',
    archivo: 'doc-writer.md',
    oracion:
      "**Exclusive role:** keep the project's technical and functional documentation aligned with the approved change, the ADRs and the code.",
  },
  {
    rol: 'engineer',
    archivo: 'engineer-node-scripts.md',
    oracion:
      "**Exclusive role:** execute the tasks of an approved OpenSpec change, writing production code and tests with TDD, following the project's architecture and security practices.",
    descripcion:
      "**Exclusive role:** execute the tasks of an approved OpenSpec change, writing production code and tests with TDD, following the project's architecture and security practices (node-scripts).",
  },
  {
    rol: 'reviewer',
    archivo: 'reviewer.md',
    oracion:
      '**Exclusive role:** review code (READ-ONLY) for compliance with OpenSpec, the declared architecture, security (OWASP) and engineering quality.',
  },
];

test('integración: la descripción es exactamente la primera oración del rol', async () => {
  const state = { host: 'opencode', stacks: [{ id: 'node-scripts' }], optional_agents: [] };

  await conFixture({ agentsMd: await agentsMdReal(), state, template: RAIZ }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template: RAIZ, proyecto, log: () => {} });

    for (const caso of CASOS) {
      const canonico = await readFile(join(RAIZ, '.atlas/agents', `${caso.rol}.md`), 'utf8');
      const bloque = bloqueDeCita(canonico);
      assert.ok(bloque, `${caso.rol}: el prompt canónico no tiene bloque de cita`);
      assert.equal(primeraOracion(bloque), caso.oracion, `${caso.rol}: el prompt canónico cambió`);

      const renderizado = await readFile(join(proyecto, '.opencode/agent', caso.archivo), 'utf8');
      assert.equal(
        valorEntrecomillado(leerDescripcion(renderizado)),
        caso.descripcion ?? caso.oracion,
        `${caso.archivo}: descripción inesperada`,
      );
    }
  });
});

test('integración: la descripción no filtra instrucciones operativas del prompt', async () => {
  const state = { host: 'opencode', stacks: [{ id: 'node-scripts' }], optional_agents: [] };

  await conFixture({ agentsMd: await agentsMdReal(), state, template: RAIZ }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template: RAIZ, proyecto, log: () => {} });

    const prohibidos = [/Announce your role/, /single source of truth/i, /You do not propose/, /Runs at cycle close/];
    for (const caso of CASOS) {
      const renderizado = await readFile(join(proyecto, '.opencode/agent', caso.archivo), 'utf8');
      const valor = valorEntrecomillado(leerDescripcion(renderizado));
      for (const prohibido of prohibidos) {
        assert.ok(!prohibido.test(valor), `${caso.archivo}: la descripción incluye ${prohibido}`);
      }
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
      '> **Operational:** this second sentence is not part of the description.',
      '',
      'Cuerpo del rol.',
      '',
    ].join('\n'),
    'sin-bloque': ['# sin-bloque', '', 'Cuerpo sin bloque de cita.', ''].join('\n'),
  });
  const state = { host: 'opencode', stacks: [], optional_agents: [] };
  const esperada =
    "**Exclusive role:** keep the project's notes aligned with the approved change, the ADRs and the code.";

  await conFixture({ agentsMd: AGENTS_MINIMO, state, template }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const renderizado = await readFile(join(proyecto, '.opencode/agent/narrador.md'), 'utf8');
    const linea = leerDescripcion(renderizado);
    assert.equal(
      linea,
      "description: '**Exclusive role:** keep the project''s notes aligned with the approved change, the ADRs and the code.'",
      'la línea YAML no entrecomilla o no escapa la comilla interna',
    );
    assert.equal(valorEntrecomillado(linea), esperada);

    const vacio = await readFile(join(proyecto, '.opencode/agent/sin-bloque.md'), 'utf8');
    assert.equal(vacio.split('\n')[1], "description: 'Rol sin-bloque del arnés'");
  });
});

test('el host claude también entrecomilla y recorta a la primera oración', async () => {
  const template = await crearTemplateSintetico({
    narrador: [
      '# narrador',
      '',
      "> **Exclusive role:** keep the project's notes aligned.",
      '> Second sentence skipped.',
      '',
    ].join('\n'),
  });
  const state = { host: 'claude', stacks: [], optional_agents: [] };
  const esperada = "**Exclusive role:** keep the project's notes aligned.";

  await conFixture({ agentsMd: AGENTS_MINIMO, state, template }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const renderizado = await readFile(join(proyecto, '.claude/agents/narrador.md'), 'utf8');
    const linea = leerDescripcion(renderizado);
    assert.equal(
      linea,
      "description: '**Exclusive role:** keep the project''s notes aligned.'",
      'la línea YAML no entrecomilla o no escapa la comilla interna',
    );
    assert.equal(valorEntrecomillado(linea), esperada);
  });
});

test('el stack se inserta antes del punto y solo en los adaptadores por stack', async () => {
  const template = await crearTemplateSintetico({
    engineer: ['# engineer', '', '> **Exclusive role:** build things without a final period', ''].join('\n'),
  });
  const conStack = { host: 'opencode', stacks: [{ id: 'node-scripts' }], optional_agents: [] };

  await conFixture({ agentsMd: AGENTS_MINIMO, state: conStack, template }, async ({ proyecto }) => {
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const renderizado = await readFile(join(proyecto, '.opencode/agent/engineer-node-scripts.md'), 'utf8');
    const linea = leerDescripcion(renderizado);
    assert.equal(
      linea,
      "description: '**Exclusive role:** build things without a final period (node-scripts)'",
      'el sufijo del stack debe quedar dentro de las comillas',
    );
    assert.equal(
      valorEntrecomillado(linea),
      '**Exclusive role:** build things without a final period (node-scripts)',
    );

    // Sin stacks se genera el adaptador genérico, que no lleva sufijo.
    const sinStacks = { ...conStack, stacks: [] };
    await writeFile(join(proyecto, '.atlas/state.json'), JSON.stringify(sinStacks, null, 2), 'utf8');
    await renderizarAdaptadores({ template, proyecto, log: () => {} });

    const generico = await readFile(join(proyecto, '.opencode/agent/engineer.md'), 'utf8');
    assert.equal(
      valorEntrecomillado(leerDescripcion(generico)),
      '**Exclusive role:** build things without a final period',
      'el adaptador genérico no lleva sufijo de stack',
    );
  });
});
