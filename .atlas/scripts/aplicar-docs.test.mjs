// aplicar-docs.test.mjs — pruebas de la aplicación de la documentación opcional.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Las fixtures se construyen en un directorio temporal copiando los archivos REALES
// del template (`AGENTS.md` y el árbol `docs/`), de modo que las pruebas validan el
// contenido que se entrega, no una maqueta.
//
// Uso: node --test .atlas/scripts/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { aplicarDocs } from './aplicar-docs.mjs';

const RAIZ_TEMPLATE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AREAS = ['functional', 'architecture', 'api', 'guides'];
const ETIQUETAS = {
  functional: 'Functional documentation (Use Cases)',
  architecture: 'Architecture and C4',
  api: 'API contracts',
  guides: 'Development guides',
};
const FILA_PROYECTO = /^\|\s*📦\s*\*\*(Proyecto|Project)\*\*\s*\|/;
const PATRON_ESTRUCTURA = /(^|[\s│├└─])(?:architecture\/|api\/|functional\/|guides\/)/;

const silencio = () => {};

async function existe(ruta) {
  return access(ruta).then(
    () => true,
    () => false,
  );
}

async function crearFixture({ mode = 'greenfield', docs, idioma = 'es', bilingual = false, skills } = {}) {
  const fixture = await mkdtemp(join(tmpdir(), 'aplicar-docs-'));
  // Copia el template completo (salvo .git/node_modules) para que la integridad de
  // enlaces se valide contra el contenido real que se entrega.
  await cp(RAIZ_TEMPLATE, fixture, {
    recursive: true,
    filter: (origen) => !['.git', 'node_modules'].includes(basename(origen)),
  });
  await mkdir(join(fixture, '.atlas'), { recursive: true });
  const configDocs = docs ?? { root: 'docs', functional: null, architecture: null, api: null, guides: null };
  await writeFile(
    join(fixture, '.atlas/state.json'),
    `${JSON.stringify(
      {
        status: 'pending',
        mode,
        language: { user: idioma, agent: 'en' },
        docs: { bilingual, ...configDocs },
        skills: skills ?? { duplicates: [], decision: null, reason: null },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return fixture;
}

async function instantanea(raiz, actual = '', mapa = new Map()) {
  for (const entrada of await readdir(join(raiz, actual), { withFileTypes: true })) {
    const rel = actual === '' ? entrada.name : `${actual}/${entrada.name}`;
    if (entrada.isDirectory()) {
      mapa.set(`${rel}/`, 'dir');
      await instantanea(raiz, rel, mapa);
    } else {
      mapa.set(rel, createHash('sha256').update(await readFile(join(raiz, rel))).digest('hex'));
    }
  }
  return mapa;
}

function assertInstantaneasIguales(antes, despues, mensaje) {
  assert.deepEqual([...despues.entries()].sort(), [...antes.entries()].sort(), mensaje);
}

function leer(rel) {
  return readFile(rel, 'utf8');
}

function areasEnFilaProyecto(texto) {
  const linea = texto.split('\n').find((actual) => FILA_PROYECTO.test(actual));
  if (linea === undefined) return null;
  return new Set([...linea.matchAll(/`([^`]+)`/g)].map((coincidencia) => coincidencia[1].split('/').pop()));
}

function lineasEstructura(texto) {
  return texto.split('\n').filter((linea) => PATRON_ESTRUCTURA.test(linea) && !FILA_PROYECTO.test(linea));
}

function assertSinAreaNoSeleccionada(texto, area, root, archivo) {
  assert.ok(!texto.includes(`${root}/${area}`), `${archivo} referencia la ruta ${root}/${area}`);
  assert.ok(
    !new RegExp(`(^|[\\s\`│├└─])${area}/`).test(texto),
    `${archivo} sigue citando la sección ${area}/`,
  );
}

function assertParidad(textoEs, textoEn) {
  const es = areasEnFilaProyecto(textoEs);
  const en = areasEnFilaProyecto(textoEn);
  assert.deepEqual(es === null ? null : [...es].sort(), en === null ? null : [...en].sort());
}

// Extrae `](destino)` y exige que cada enlace relativo resuelva a una ruta existente.
// Se ignoran http(s), `#anclas` y mailto.
async function assertEnlacesResueltos(raiz, archivos) {
  for (const relativo of archivos) {
    const archivo = join(raiz, relativo);
    const texto = await leer(archivo);
    for (const coincidencia of texto.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const destino = coincidencia[1];
      if (/^(?:https?:|mailto:|#|\/\/)/.test(destino)) continue;
      const ruta = destino.split('#')[0];
      if (ruta === '') continue;
      const resuelta = resolve(dirname(archivo), ruta);
      assert.ok(await existe(resuelta), `${relativo} enlaza a "${destino}", que no existe`);
    }
  }
}

test('crea solo las secciones seleccionadas y enlaza únicamente esas', async () => {
  const fixture = await crearFixture({
    bilingual: true,
    docs: {
      root: 'docs',
      functional: null,
      architecture: 'docs/architecture',
      api: 'docs/api',
      guides: null,
    },
  });
  try {
    await aplicarDocs({ proyecto: fixture, log: silencio });

    assert.ok(await existe(join(fixture, 'docs/architecture/README.md')));
    assert.ok(await existe(join(fixture, 'docs/api/README.md')));
    assert.ok(!(await existe(join(fixture, 'docs/functional'))), 'functional no debe existir');
    assert.ok(!(await existe(join(fixture, 'docs/guides'))), 'guides no debe existir');
    // Siempre presentes.
    assert.ok(await existe(join(fixture, 'docs/README.md')));
    assert.ok(await existe(join(fixture, 'docs/project-context.md')));
    assert.ok(await existe(join(fixture, 'docs/harness')));

    const estado = JSON.parse(await leer(join(fixture, '.atlas/state.json')));
    assert.equal(estado.docs.functional, null);
    assert.equal(estado.docs.guides, null);

    const agents = await leer(join(fixture, 'AGENTS.md'));
    assert.match(agents, /\| Architecture and C4 \| `docs\/architecture\/` \|/);
    assert.match(agents, /\| API contracts \| `docs\/api\/` \|/);
    assert.ok(!agents.includes('Functional documentation (Use Cases)'));
    assert.ok(!agents.includes('Development guides'));
    assert.match(agents, /\| Documentation \| `docs\/architecture`, `docs\/api` \|/);

    const portadaEs = await leer(join(fixture, 'docs/README.md'));
    const portadaEn = await leer(join(fixture, 'docs/README.en.md'));

    assert.deepEqual([...(areasEnFilaProyecto(portadaEs) ?? [])].sort(), ['api', 'architecture']);
    assertParidad(portadaEs, portadaEn);

    for (const [texto, nombre] of [
      [agents, 'AGENTS.md'],
      [portadaEs, 'docs/README.md'],
      [portadaEn, 'docs/README.en.md'],
    ]) {
      for (const area of ['functional', 'guides']) {
        assertSinAreaNoSeleccionada(texto, area, 'docs', nombre);
      }
    }

    assert.equal(lineasEstructura(portadaEs).length, 1);
    assert.match(lineasEstructura(portadaEs)[0], /architecture\/ api\//);
    assert.doesNotMatch(lineasEstructura(portadaEs)[0], /functional\/|guides\//);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('sin secciones opcionales no crea carpetas ni deja filas o enlaces', async () => {
  const fixture = await crearFixture({ bilingual: true });
  try {
    await aplicarDocs({ proyecto: fixture, log: silencio });

    for (const area of AREAS) {
      assert.ok(!(await existe(join(fixture, `docs/${area}`))), `${area} no debe existir`);
    }

    const agents = await leer(join(fixture, 'AGENTS.md'));
    for (const area of AREAS) assert.ok(!agents.includes(`| ${ETIQUETAS[area]} |`), `fila ${area}`);
    assert.match(agents, /\| Documentation \| — \|/);

    const portadaEs = await leer(join(fixture, 'docs/README.md'));
    const portadaEn = await leer(join(fixture, 'docs/README.en.md'));
    assert.equal(areasEnFilaProyecto(portadaEs), null);
    assert.equal(areasEnFilaProyecto(portadaEn), null);
    assert.equal(lineasEstructura(portadaEs).length, 0);
    assert.equal(lineasEstructura(portadaEn).length, 0);
    assertParidad(portadaEs, portadaEn);

    for (const [texto, nombre] of [
      [agents, 'AGENTS.md'],
      [portadaEs, 'docs/README.md'],
      [portadaEn, 'docs/README.en.md'],
    ]) {
      for (const area of AREAS) assertSinAreaNoSeleccionada(texto, area, 'docs', nombre);
      assert.doesNotMatch(
        texto,
        /docs\/(functional|architecture|api|guides)/,
        `${nombre} no debe citar ninguna ruta de sección bajo docs/`,
      );
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('conserva una sección no seleccionada con contenido propio y avisa', async () => {
  const fixture = await crearFixture({
    docs: {
      root: 'docs',
      functional: null,
      architecture: 'docs/architecture',
      api: 'docs/api',
      guides: null,
    },
  });
  try {
    await writeFile(join(fixture, 'docs/functional/uc-001.md'), '# UC-001\n', 'utf8');
    const lineas = [];
    await aplicarDocs({ proyecto: fixture, log: (linea) => lineas.push(linea) });

    assert.ok(await existe(join(fixture, 'docs/functional/README.md')), 'functional se conserva');
    assert.ok(await existe(join(fixture, 'docs/functional/uc-001.md')), 'el contenido del usuario se conserva');
    assert.ok(!(await existe(join(fixture, 'docs/guides'))), 'guides (solo scaffold) se elimina');
    assert.ok(
      lineas.some((linea) => linea.startsWith('⚠️') && linea.includes('docs/functional')),
      'debe avisar de la sección conservada',
    );
    assert.ok(!lineas.some((linea) => linea.startsWith('🧹') && linea.includes('docs/functional')));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('reubica docs/ a documentation/ con --mover-docs y actualiza enlaces', async () => {
  const fixture = await crearFixture({
    mode: 'greenfield',
    bilingual: true,
    docs: {
      root: 'documentation',
      functional: null,
      architecture: 'documentation/architecture',
      api: 'documentation/api',
      guides: null,
    },
  });
  try {
    const resultado = await aplicarDocs({ proyecto: fixture, decision: 'mover-docs', log: silencio });

    assert.equal(resultado.root, 'documentation');
    assert.ok(!(await existe(join(fixture, 'docs'))), 'docs/ no debe quedar duplicado');
    assert.ok(await existe(join(fixture, 'documentation/README.md')));
    assert.ok(await existe(join(fixture, 'documentation/README.en.md')));
    assert.ok(await existe(join(fixture, 'documentation/project-context.md')));
    assert.ok(await existe(join(fixture, 'documentation/harness/es/QUICKSTART.md')));
    assert.ok(await existe(join(fixture, 'documentation/architecture/README.md')));
    assert.ok(await existe(join(fixture, 'documentation/api/README.md')));
    assert.ok(!(await existe(join(fixture, 'documentation/functional'))), 'functional no seleccionada no queda');
    assert.ok(!(await existe(join(fixture, 'documentation/guides'))), 'guides no seleccionada no queda');

    const portadaEs = await leer(join(fixture, 'documentation/README.md'));
    const portadaEn = await leer(join(fixture, 'documentation/README.en.md'));
    assert.deepEqual(
      [...(areasEnFilaProyecto(portadaEs) ?? [])].sort(),
      ['api', 'architecture'],
    );
    assertParidad(portadaEs, portadaEn);
    assert.ok(
      !/`docs\/(functional|architecture|api|guides|harness|project-context|README)/.test(portadaEs),
      'la portada no debe citar rutas del proyecto bajo docs/',
    );
    assert.ok(!portadaEs.includes('](docs/'), 'la portada no debe enlazar a docs/');
    assert.ok(portadaEs.includes('documentation/harness/'));
    assert.ok(
      portadaEs.includes('.atlas/docs/es/'),
      'la documentación interna del arnés no se reescribe',
    );
    assert.ok(portadaEn.includes('.atlas/docs/en/'));

    const agents = await leer(join(fixture, 'AGENTS.md'));
    assert.match(agents, /\| Architecture and C4 \| `documentation\/architecture\/` \|/);
    assert.match(agents, /\| API contracts \| `documentation\/api\/` \|/);
    assert.match(agents, /\| Harness guides \| `documentation\/README.md`/);
    assert.ok(
      !/`docs\/(functional|architecture|api|guides)/.test(agents),
      'AGENTS.md no debe citar rutas de área bajo docs/',
    );
    assert.ok(agents.includes('`documentation/project-context.md`'));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('exige una decisión explícita si docs/ ya existe y la raíz es otra', async () => {
  const fixture = await crearFixture({
    mode: 'greenfield',
    docs: { root: 'documentation', functional: null, architecture: null, api: null, guides: null },
  });
  try {
    const antes = await instantanea(fixture);

    await assert.rejects(
      () => aplicarDocs({ proyecto: fixture, log: silencio }),
      (error) => {
        assert.match(error.message, /--mover-docs/);
        assert.match(error.message, /--mantener-ambas/);
        assert.match(error.message, /--descartar-docs/);
        assert.match(error.message, /docs\//);
        return true;
      },
    );

    assertInstantaneasIguales(antes, await instantanea(fixture), 'sin decisión no se escribe nada');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('--mantener-ambas copia el scaffold y conserva docs/ intacto', async () => {
  const fixture = await crearFixture({
    mode: 'greenfield',
    docs: {
      root: 'documentation',
      functional: null,
      architecture: 'documentation/architecture',
      api: null,
      guides: null,
    },
  });
  try {
    const docsAntes = await instantanea(join(fixture, 'docs'));
    const resultado = await aplicarDocs({ proyecto: fixture, decision: 'mantener-ambas', log: silencio });

    assert.equal(resultado.decision, 'mantener-ambas');
    assert.ok(await existe(join(fixture, 'docs/README.md')));
    assert.ok(await existe(join(fixture, 'documentation/README.md')));
    assertInstantaneasIguales(docsAntes, await instantanea(join(fixture, 'docs')), 'docs/ debe quedar intacto');
    assert.ok(await existe(join(fixture, 'documentation/architecture/README.md')));
    assert.ok(!(await existe(join(fixture, 'documentation/functional'))), 'la limpieza solo aplica a la raíz nueva');
    assert.ok(!(await existe(join(fixture, 'documentation/api'))), 'api no seleccionada no queda en la raíz nueva');
    assert.ok(await existe(join(fixture, 'docs/functional/README.md')), 'docs/ original conserva su scaffold');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('brownfield usa la raíz existente y respeta el README del usuario', async () => {
  const fixture = await crearFixture({
    mode: 'brownfield',
    docs: {
      root: 'documentation',
      functional: 'documentation/functional',
      architecture: null,
      api: null,
      guides: null,
    },
  });
  try {
    const contenidoUsuario = '# Documentación propia\n\nÍndice mantenido por el equipo.\n';
    await mkdir(join(fixture, 'documentation'), { recursive: true });
    await writeFile(join(fixture, 'documentation/README.md'), contenidoUsuario, 'utf8');
    const usuarioAntes = await readFile(join(fixture, 'documentation/README.md'));

    await aplicarDocs({ proyecto: fixture, log: silencio });

    assert.deepEqual(
      await readFile(join(fixture, 'documentation/README.md')),
      usuarioAntes,
      'el README del usuario no se toca',
    );
    assert.ok(await existe(join(fixture, 'documentation/functional/README.md')));
    assert.ok(await existe(join(fixture, 'documentation/project-context.md')));
    assert.ok(await existe(join(fixture, 'documentation/harness')));
    assert.ok(await existe(join(fixture, 'docs')), 'no debe haber reubicación: docs/ sigue ahí');

    const agents = await leer(join(fixture, 'AGENTS.md'));
    assert.match(agents, /\| Functional documentation \(Use Cases\) \| `documentation\/functional\/` \|/);
    assert.ok(!agents.includes('Architecture and C4'));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('--descartar-docs funciona en greenfield y se rechaza en brownfield', async () => {
  const docs = {
    root: 'documentation',
    functional: null,
    architecture: 'documentation/architecture',
    api: null,
    guides: null,
  };

  const greenfield = await crearFixture({ mode: 'greenfield', docs });
  try {
    await aplicarDocs({ proyecto: greenfield, decision: 'descartar-docs', log: silencio });
    assert.ok(!(await existe(join(greenfield, 'docs'))), 'docs/ se elimina en greenfield');
    assert.ok(await existe(join(greenfield, 'documentation/README.md')));
    assert.ok(await existe(join(greenfield, 'documentation/architecture/README.md')));
    assert.ok(!(await existe(join(greenfield, 'documentation/functional'))), 'functional no seleccionada no queda');
    assert.ok(!(await existe(join(greenfield, 'documentation/guides'))), 'guides no seleccionada no queda');
  } finally {
    await rm(greenfield, { recursive: true, force: true });
  }

  const brownfield = await crearFixture({ mode: 'brownfield', docs });
  try {
    const antes = await instantanea(brownfield);
    await assert.rejects(
      () => aplicarDocs({ proyecto: brownfield, decision: 'descartar-docs', log: silencio }),
      /greenfield/,
    );
    assertInstantaneasIguales(antes, await instantanea(brownfield), 'brownfield no borra docs/');
  } finally {
    await rm(brownfield, { recursive: true, force: true });
  }
});

test('--dry-run no escribe nada, ni siquiera cuando falta la decisión', async () => {
  const fixture = await crearFixture({
    docs: {
      root: 'docs',
      functional: null,
      architecture: 'docs/architecture',
      api: 'docs/api',
      guides: null,
    },
  });
  const pendiente = await crearFixture({
    docs: { root: 'documentation', functional: null, architecture: null, api: null, guides: null },
  });
  try {
    const antes = await instantanea(fixture);
    const resultado = await aplicarDocs({ proyecto: fixture, dryRun: true, log: silencio });
    assert.equal(resultado.dryRun, true);
    assertInstantaneasIguales(antes, await instantanea(fixture), 'dry-run no escribe');

    const antesPendiente = await instantanea(pendiente);
    const planes = [];
    const resultadoPendiente = await aplicarDocs({
      proyecto: pendiente,
      dryRun: true,
      log: (linea) => planes.push(linea),
    });
    assert.equal(resultadoPendiente.pendiente, true);
    assertInstantaneasIguales(antesPendiente, await instantanea(pendiente), 'dry-run no escribe');
    assert.ok(planes.some((linea) => linea.includes('--mover-docs')));
    assert.ok(planes.some((linea) => linea.includes('--mantener-ambas')));
    assert.ok(planes.some((linea) => linea.includes('--descartar-docs')));
  } finally {
    await rm(fixture, { recursive: true, force: true });
    await rm(pendiente, { recursive: true, force: true });
  }
});

test('es sin bilingüe deja solo la portada española y sin referencias a README.en.md', async () => {
  const fixture = await crearFixture();
  try {
    await writeFile(
      join(fixture, 'README.md'),
      '# Proyecto\n\n[Portada inglesa](docs/README.en.md)\n',
      'utf8',
    );
    await aplicarDocs({ proyecto: fixture, log: silencio });

    assert.ok(await existe(join(fixture, 'docs/README.md')));
    assert.ok(!(await existe(join(fixture, 'docs/README.en.md'))), 'el scaffold inglés se elimina');

    const portada = await leer(join(fixture, 'docs/README.md'));
    assert.match(portada, /> \*\*Idioma:\*\* Español\n/);
    for (const relativo of ['docs/README.md', 'AGENTS.md', 'README.md']) {
      assert.ok(
        !(await leer(join(fixture, relativo))).includes('README.en.md'),
        `${relativo} no debe citar README.en.md`,
      );
    }
    assert.ok(
      (await leer(join(fixture, 'README.md'))).includes('[Portada inglesa](docs/README.md)'),
      'el README del proyecto se reescribe al landing existente',
    );
    await assertEnlacesResueltos(fixture, ['docs/README.md']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('en sin bilingüe mueve la portada inglesa a README.md y elimina README.en.md', async () => {
  const fixture = await crearFixture({ idioma: 'en' });
  try {
    await aplicarDocs({ proyecto: fixture, log: silencio });

    assert.ok(await existe(join(fixture, 'docs/README.md')));
    assert.ok(!(await existe(join(fixture, 'docs/README.en.md'))));

    const portada = await leer(join(fixture, 'docs/README.md'));
    assert.match(portada.split('\n')[0], /^#\s*🧭\s*ATLAS\s*—\s*OpenSpec \+ Agents/);
    assert.ok(portada.includes('> **Language:** English\n'));
    assert.ok(portada.includes('# landing page'), 'la estructura ya no dice "Spanish landing page"');
    for (const relativo of ['docs/README.md', 'AGENTS.md']) {
      assert.ok(
        !(await leer(join(fixture, relativo))).includes('README.en.md'),
        `${relativo} no debe citar README.en.md`,
      );
    }
    await assertEnlacesResueltos(fixture, ['docs/README.md']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('es con docs.bilingual conserva ambas portadas, sus enlaces y la estructura', async () => {
  const fixture = await crearFixture({ bilingual: true });
  try {
    await aplicarDocs({ proyecto: fixture, log: silencio });

    assert.ok(await existe(join(fixture, 'docs/README.md')));
    assert.ok(await existe(join(fixture, 'docs/README.en.md')));

    const portadaEs = await leer(join(fixture, 'docs/README.md'));
    const portadaEn = await leer(join(fixture, 'docs/README.en.md'));
    assert.ok(portadaEs.includes('> **Idioma:** Español · [English](README.en.md)'));
    assert.ok(portadaEn.includes('> **Language:** English · [Español](README.md)'));
    assert.match(portadaEs, /README\.md\s+# este índice/);
    assert.match(portadaEs, /README\.en\.md\s+# portada en inglés/);
    assert.match(portadaEn, /README\.md\s+# Spanish landing page/);
    assert.match(portadaEn, /README\.en\.md\s+# this English landing page/);
    await assertEnlacesResueltos(fixture, ['docs/README.md', 'docs/README.en.md']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('la portada no enlaza a archivos inexistentes en los tres modos', async () => {
  const casos = [
    { nombre: 'es', opciones: {} },
    { nombre: 'en', opciones: { idioma: 'en' } },
    { nombre: 'bilingüe', opciones: { bilingual: true } },
  ];
  for (const caso of casos) {
    const fixture = await crearFixture(caso.opciones);
    try {
      await aplicarDocs({ proyecto: fixture, log: silencio });
      const portadas = (await existe(join(fixture, 'docs/README.en.md')))
        ? ['docs/README.md', 'docs/README.en.md']
        : ['docs/README.md'];
      await assertEnlacesResueltos(fixture, portadas);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  }
});

test('brownfield es conserva README.en.md existente y avisa', async () => {
  const fixture = await crearFixture({ mode: 'brownfield' });
  try {
    const lineas = [];
    await aplicarDocs({ proyecto: fixture, log: (linea) => lineas.push(linea) });

    assert.ok(await existe(join(fixture, 'docs/README.en.md')), 'no se elimina contenido existente');
    assert.match(await leer(join(fixture, 'docs/README.en.md')), /^#\s*🧭\s*ATLAS\s*—\s*OpenSpec \+ Agents/);
    assert.ok(
      lineas.some((linea) => linea.startsWith('⚠️') && linea.includes('README.en.md')),
      'debe avisar de la portada conservada',
    );
    await assertEnlacesResueltos(fixture, ['docs/README.md', 'docs/README.en.md']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('aplicar-docs no modifica state.skills (solo lo usa el bootstrap)', async () => {
  const skills = { duplicates: ['grilling'], decision: 'both', reason: 'team-owned fork' };
  const fixture = await crearFixture({ skills });
  try {
    const antes = JSON.parse(await leer(join(fixture, '.atlas/state.json')));
    await aplicarDocs({ proyecto: fixture, log: silencio });
    const despues = JSON.parse(await leer(join(fixture, '.atlas/state.json')));
    assert.deepEqual(despues.skills, antes.skills);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('es idempotente: la segunda ejecución no cambia un byte', async () => {
  const fixture = await crearFixture({
    docs: {
      root: 'docs',
      functional: null,
      architecture: 'docs/architecture',
      api: 'docs/api',
      guides: null,
    },
  });
  try {
    await aplicarDocs({ proyecto: fixture, log: silencio });
    const primera = await instantanea(fixture);

    const lineas = [];
    await aplicarDocs({ proyecto: fixture, log: (linea) => lineas.push(linea) });
    assertInstantaneasIguales(primera, await instantanea(fixture), 'segunda ejecución idéntica');
    assert.ok(lineas.every((linea) => !linea.startsWith('✅')), 'nada pendiente en la segunda pasada');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
