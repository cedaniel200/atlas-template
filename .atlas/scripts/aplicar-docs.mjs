#!/usr/bin/env node
// aplicar-docs.mjs — crea y enlaza SOLO las secciones de documentación elegidas.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Lee `.atlas/state.json`:
//   docs.root               raíz de la documentación del proyecto (`docs` por defecto)
//   docs.functional|architecture|api|guides
//                           ruta relativa de la sección (incluye la raíz) o `null`
//   mode                    `greenfield` | `brownfield` (lo exige `--descartar-docs`)
//   language.user           idioma de los stubs y de la portada (`es` por defecto)
//   docs.bilingual          `true` conserva las dos portadas (`README.md` y `README.en.md`)
//
// Siempre existen `<root>/README.md`, `<root>/project-context.md`, `<root>/harness/`
// y el directorio de ADR (`adr/` por defecto; su ruta vive en `AGENTS.md`).
//
// La portada inglesa es opcional: en `es` se retira el scaffold `README.en.md` en
// `greenfield`; en `en` su contenido pasa a `README.md`. Con `docs.bilingual: true` se
// conservan ambas y nunca se inventa una traducción.
//
// Nunca copia `docs/` a otra raíz sin una decisión explícita del usuario y nunca
// sobrescribe un archivo existente. Es idempotente: una segunda ejecución no escribe.
//
// Única eliminación que realiza: en `greenfield` retira el scaffold de las secciones no
// seleccionadas que el template entrega (`<root>/<área>/` con exclusivamente `README.md`)
// y la portada inglesa scaffold. Si el directorio tiene cualquier otro archivo o
// subdirectorio se conserva y se avisa; en `brownfield` no elimina nada.
// `--dry-run` solo informa de lo que eliminaría.
//
// Uso:
//   node .atlas/scripts/aplicar-docs.mjs [--proyecto <dir>] [--dry-run]
//        [--mover-docs | --mantener-ambas | --descartar-docs]

import { access, cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const AREAS = ['architecture', 'api', 'functional', 'guides'];
const DECISIONES = ['mover-docs', 'mantener-ambas', 'descartar-docs'];
const ROOT_CANONICA = 'docs';

const ETIQUETAS_AGENTS = {
  functional: 'Functional documentation (Use Cases)',
  architecture: 'Architecture and C4',
  api: 'API contracts',
  guides: 'Development guides',
};

const TEXTOS = {
  es: {
    readme: {
      titulo: 'Documentación del proyecto',
      proposito: 'Índice de la documentación del proyecto.',
      todo: 'Añade aquí el índice de las capas de documentación del proyecto.',
    },
    contexto: {
      titulo: 'Contexto del proyecto',
      proposito: 'Contexto específico del proyecto que complementa `AGENTS.md`.',
      todo: 'Describe el dominio, los módulos y los términos del negocio.',
    },
    secciones: {
      functional: {
        titulo: 'Documentación funcional',
        proposito: 'Casos de uso y reglas de negocio del proyecto.',
        todo: 'Documenta los casos de uso aprobados y sus reglas de negocio.',
      },
      architecture: {
        titulo: 'Arquitectura y C4',
        proposito: 'Vista de arquitectura del proyecto y diagramas C4.',
        todo: 'Describe la arquitectura declarada y sus límites.',
      },
      api: {
        titulo: 'Contratos de API',
        proposito: 'Contratos y esquemas de las interfaces del proyecto.',
        todo: 'Documenta los contratos de API vigentes.',
      },
      guides: {
        titulo: 'Guías de desarrollo',
        proposito: 'Guías para desarrollar, probar y operar el proyecto.',
        todo: 'Añade las guías de desarrollo, pruebas y operación.',
      },
    },
  },
  en: {
    readme: {
      titulo: 'Project documentation',
      proposito: 'Index of the project documentation.',
      todo: 'Add here the index of the project documentation layers.',
    },
    contexto: {
      titulo: 'Project context',
      proposito: 'Project-specific context that complements `AGENTS.md`.',
      todo: 'Describe the domain, the modules and the business terms.',
    },
    secciones: {
      functional: {
        titulo: 'Functional documentation',
        proposito: 'Use cases and business rules of the project.',
        todo: 'Document the approved use cases and their business rules.',
      },
      architecture: {
        titulo: 'Architecture and C4',
        proposito: 'Architecture view of the project and C4 diagrams.',
        todo: 'Describe the declared architecture and its boundaries.',
      },
      api: {
        titulo: 'API contracts',
        proposito: 'Contracts and schemas of the project interfaces.',
        todo: 'Document the in-force API contracts.',
      },
      guides: {
        titulo: 'Development guides',
        proposito: 'Guides to develop, test and operate the project.',
        todo: 'Add the development, testing and operations guides.',
      },
    },
  },
};

const existe = (ruta) =>
  access(ruta).then(
    () => true,
    () => false,
  );

function validarRuta(valor, etiqueta) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(`${etiqueta}: se esperaba una ruta relativa no vacía`);
  }
  const ruta = valor.trim().replaceAll('\\', '/').replace(/\/+$/, '');
  if (ruta.startsWith('/') || /^[A-Za-z]:/.test(ruta)) {
    throw new Error(`${etiqueta}: "${valor}" debe ser una ruta relativa (sin / inicial)`);
  }
  if (ruta.split('/').includes('..')) {
    throw new Error(`${etiqueta}: "${valor}" no puede contener ..`);
  }
  return ruta;
}

function stub({ titulo, proposito, todo }) {
  return `# ${titulo}\n\n${proposito}\n\n<!-- TODO: ${todo} -->\n`;
}

// Referencias de la portada a la raíz canónica del proyecto. `.atlas/docs/` es la
// documentación interna del arnés y no se toca: por eso se reemplazan rutas exactas
// (README, contexto y harness) y la línea de estructura que declara el directorio raíz.
const RUTAS_DE_RAIZ = ['docs/README.en.md', 'docs/README.md', 'docs/project-context.md', 'docs/harness/'];

function reemplazarRaiz(texto, root) {
  if (root === ROOT_CANONICA) return texto;
  let resultado = texto;
  for (const ruta of RUTAS_DE_RAIZ) {
    const resto = ruta.slice(ROOT_CANONICA.length + 1);
    resultado = resultado.split(ruta).join(`${root}/${resto}`);
  }
  return resultado
    .split('\n')
    .map((linea) =>
      linea.replace(
        /^(\s*[│├└─\-\s]*?)docs\/(\s*#.*)?$/,
        (_, prefijo, comentario = '') => `${prefijo}${root}/${comentario}`,
      ),
    )
    .join('\n');
}

// Segunda celda de una fila de tabla Markdown, conservando el resto de celdas.
function conSegundaCelda(linea, valor) {
  const celdas = linea.split('|');
  return `|${celdas[1]}| ${valor} |${celdas[3]}|`;
}

function valorSeleccionadas(rutas) {
  return rutas.length === 0 ? '—' : rutas.map((ruta) => `\`${ruta}\``).join(', ');
}

function reescribirPortada(texto, { root, seleccionadas }) {
  const salida = [];
  for (const linea of texto.split('\n')) {
    if (/^\|\s*📦\s*\*\*(Proyecto|Project)\*\*\s*\|/.test(linea)) {
      if (seleccionadas.length > 0) salida.push(conSegundaCelda(linea, valorSeleccionadas(seleccionadas)));
      continue;
    }
    const bloque = linea.match(
      /(^|[\s│├└─])((?:architecture\/|api\/|functional\/|guides\/)(?:[ \t]*(?:architecture\/|api\/|functional\/|guides\/))*)/,
    );
    if (bloque) {
      if (seleccionadas.length > 0) {
        const nombres = seleccionadas.map((ruta) => basename(ruta));
        const reemplazo = `${bloque[1]}${nombres.map((nombre) => `${nombre}/`).join(' ')}`;
        const fin = bloque.index + bloque[0].length;
        salida.push(linea.slice(0, bloque.index) + reemplazo + linea.slice(fin));
      }
      continue;
    }
    salida.push(linea);
  }
  return reemplazarRaiz(salida.join('\n'), root);
}

function reescribirAgents(texto, { root, secciones, rutas }) {
  const lineas = [];
  let enMapa = false;
  for (const linea of texto.split('\n')) {
    if (/^## /.test(linea)) enMapa = /^## Document map\s*$/.test(linea);
    if (enMapa) {
      const area = AREAS.find((candidata) => linea.startsWith(`| ${ETIQUETAS_AGENTS[candidata]} |`));
      if (area !== undefined) {
        if (rutas[area] !== null) lineas.push(`| ${ETIQUETAS_AGENTS[area]} | \`${rutas[area]}/\` |`);
        continue;
      }
      lineas.push(root === ROOT_CANONICA ? linea : linea.split('`docs/').join(`\`${root}/`));
      continue;
    }
    lineas.push(linea);
  }
  return reescribirPreferencias(lineas.join('\n'), secciones);
}

function reescribirPreferencias(texto, rutasSeleccionadas) {
  let enPreferencias = false;
  return texto
    .split('\n')
    .map((linea) => {
      if (/^## /.test(linea)) enPreferencias = /^## Preferences\s*$/.test(linea);
      if (!enPreferencias) return linea;
      const celdas = linea.split('|');
      if (celdas.length < 4 || celdas[1].trim() !== 'Documentation') return linea;
      return conSegundaCelda(linea, valorSeleccionadas(rutasSeleccionadas));
    })
    .join('\n');
}

function reescribirReadmeProyecto(texto, { seleccionadas }) {
  let resultado = texto;
  const pendientes = [];
  for (const area of AREAS) {
    const canonica = `docs/${area}`;
    const configurada = seleccionadas.get(area);
    if (configurada) resultado = resultado.split(canonica).join(configurada);
    else if (resultado.includes(canonica)) pendientes.push(canonica);
  }
  return { texto: resultado, pendientes };
}

// Resuelve la portada del proyecto. La portada inglesa (`README.en.md`) es opcional:
// solo se conserva con `docs.bilingual: true`. Cuando se retira, nada puede enlazarla.
function esPortadaScaffold(texto) {
  return /^#\s*🧭\s*ATLAS/m.test(texto.split('\n').slice(0, 5).join('\n'));
}

function esPortadaInglesa(texto) {
  return /^#\s*🧭\s*ATLAS\s*—\s*OpenSpec \+ Agents/m.test(texto.split('\n').slice(0, 5).join('\n'));
}

function comoPortadaInglesa(texto) {
  return texto
    .replace(/# Spanish landing page/g, '# landing page')
    .replace(/# portada en español/g, '# landing page');
}

function quitarConmutadorDeIdioma(linea) {
  return linea
    .replace(/ · \[English\]\(README\.en\.md\)/g, '')
    .replace(/ · \[Español\]\(README\.md\)/g, '');
}

// Elimina el conmutador de idioma y la línea de estructura de la portada inglesa.
// En AGENTS.md y en el README del proyecto reescribe las referencias al landing que sí existe.
function retirarPortadaInglesa(texto, { esPortada = false } = {}) {
  return texto
    .split('\n')
    .filter((linea) => !(linea.includes('README.en.md') && /^\s*[│├└─]/.test(linea)))
    .map((linea) =>
      esPortada ? quitarConmutadorDeIdioma(linea) : linea.split('README.en.md').join('README.md'),
    )
    .join('\n');
}

async function resolverPortadas({ rutaRoot, root, idioma, bilingual, modo, dryRun, avisar }) {
  const rutaPrincipal = join(rutaRoot, 'README.md');
  const rutaInglesa = join(rutaRoot, 'README.en.md');
  const hayPrincipal = await existe(rutaPrincipal);
  const hayInglesa = await existe(rutaInglesa);

  if (bilingual) {
    if (!hayPrincipal) avisar('⚠️', `${root}/README.md no existe: no se inventa la portada`);
    if (!hayInglesa) avisar('⚠️', `${root}/README.en.md no existe: no se inventa la traducción`);
    return;
  }

  if (idioma === 'en') {
    if (hayInglesa) {
      const principal = hayPrincipal ? await readFile(rutaPrincipal, 'utf8') : null;
      if (principal !== null && !esPortadaScaffold(principal)) {
        avisar('⚠️', `${root}/README.en.md conservado: ${root}/README.md no es scaffold`);
        return;
      }
      const inglesa = comoPortadaInglesa(
        retirarPortadaInglesa(await readFile(rutaInglesa, 'utf8'), { esPortada: true }),
      );
      if (!dryRun) {
        await mkdir(rutaRoot, { recursive: true });
        await writeFile(rutaPrincipal, inglesa, 'utf8');
        await rm(rutaInglesa, { force: true });
      }
      avisar('✅', `${root}/README.en.md → ${root}/README.md (portada inglesa)`);
      return;
    }
    if (hayPrincipal) {
      const principal = await readFile(rutaPrincipal, 'utf8');
      if (esPortadaScaffold(principal) && !esPortadaInglesa(principal)) {
        avisar('⚠️', `falta la portada inglesa en ${root}/README.md y no se inventa una traducción`);
      }
    }
    return;
  }

  if (!hayInglesa) return;
  if (modo === 'greenfield' && esPortadaScaffold(await readFile(rutaInglesa, 'utf8'))) {
    if (!dryRun) await rm(rutaInglesa, { force: true });
    avisar('🧹', `${root}/README.en.md eliminado (scaffold en greenfield)`);
    return;
  }
  avisar('⚠️', `${root}/README.en.md conservado (contenido existente)`);
}

// Sin portada inglesa, ningún archivo puede seguir enlazándola.
async function ajustarEnlacesPortada({ proyecto, rutaRoot, root, dryRun, avisar }) {
  if (await existe(join(rutaRoot, 'README.en.md'))) return;
  const destinos = [
    { ruta: join(rutaRoot, 'README.md'), relativo: `${root}/README.md`, esPortada: true },
    { ruta: join(proyecto, 'AGENTS.md'), relativo: 'AGENTS.md', esPortada: false },
    { ruta: join(proyecto, 'README.md'), relativo: 'README.md', esPortada: false },
  ];
  for (const destino of destinos) {
    if (!(await existe(destino.ruta))) continue;
    const original = await readFile(destino.ruta, 'utf8');
    const reescrito = retirarPortadaInglesa(original, { esPortada: destino.esPortada });
    if (reescrito === original) continue;
    if (!dryRun) await writeFile(destino.ruta, reescrito, 'utf8');
    avisar('✅', `${destino.relativo}: referencias a la portada inglesa corregidas`);
  }
}

// Resuelve la raíz de documentación. Nunca copia `docs/` sin una decisión explícita.
async function resolverRaiz({ proyecto, root, decision, modo, dryRun, avisar, log }) {
  const rutaRoot = join(proyecto, root);
  const rutaDocs = join(proyecto, ROOT_CANONICA);
  const hayRoot = await existe(rutaRoot);
  const hayDocs = root === ROOT_CANONICA ? hayRoot : await existe(rutaDocs);

  if (root === ROOT_CANONICA) {
    if (!hayRoot) throw new Error(`no hay scaffold de documentación: no existe ${ROOT_CANONICA}/`);
    return { pendiente: false };
  }
  if (hayRoot) {
    avisar('⏭️', `${root}/ ya existe: se usa tal cual (no se reubica nada)`);
    if (decision !== null) log(`⏭️ --${decision} no hace falta: ${root}/ ya existe`);
    return { pendiente: false };
  }
  if (!hayDocs) {
    throw new Error(`no hay scaffold de documentación: no existe ${root}/ ni ${ROOT_CANONICA}/`);
  }
  if (decision === null) {
    if (dryRun) {
      avisar('⚠️', `${root}/ no existe y ${ROOT_CANONICA}/ sí: hace falta una decisión explícita`);
      log(`   ${DECISIONES.map((opcion) => `--${opcion}`).join(', ')}`);
      log(`⚠️ sin decisión no se duplica ${ROOT_CANONICA}/; --dry-run no escribe nada`);
      return { pendiente: true };
    }
    throw new Error(
      `${root}/ no existe y ${ROOT_CANONICA}/ sí. No se duplica ${ROOT_CANONICA}/ sin una decisión explícita: ` +
        `usa --mover-docs (mueve), --mantener-ambas (copia y conserva) o --descartar-docs ` +
        `(copia y elimina ${ROOT_CANONICA}/, solo greenfield)`,
    );
  }
  if (decision === 'descartar-docs' && modo !== 'greenfield') {
    throw new Error(
      `--descartar-docs solo está permitido con state.mode "greenfield" (modo actual: ${modo ?? 'null'})`,
    );
  }
  if (decision === 'mover-docs') {
    if (!dryRun) {
      await mkdir(dirname(rutaRoot), { recursive: true });
      await rename(rutaDocs, rutaRoot);
    }
    avisar('✅', `${ROOT_CANONICA}/ → ${root}/`);
    return { pendiente: false };
  }
  if (!dryRun) await cp(rutaDocs, rutaRoot, { recursive: true });
  avisar('✅', `${ROOT_CANONICA}/ → ${root}/ (copia)`);
  if (decision === 'descartar-docs') {
    if (!dryRun) await rm(rutaDocs, { recursive: true, force: true });
    avisar('✅', `${ROOT_CANONICA}/ eliminado (decisión explícita en greenfield)`);
  } else {
    avisar('⏭️', `${ROOT_CANONICA}/ conservado (decisión explícita)`);
  }
  return { pendiente: false };
}

// Única eliminación del script. Solo actúa en greenfield y solo sobre el scaffold que
// entrega el template: un directorio de sección no seleccionada que contiene únicamente
// `README.md`. Cualquier contenido propio del usuario lo conserva y lo declara.
async function contieneSoloScaffold(ruta) {
  const entradas = await readdir(ruta, { withFileTypes: true });
  return entradas.length === 1 && entradas[0].isFile() && entradas[0].name === 'README.md';
}

async function limpiarScaffoldNoSeleccionado({ rutaRoot, root, rutas, modo, dryRun, avisar }) {
  if (modo !== 'greenfield') return;
  for (const area of AREAS) {
    if (rutas[area] !== null) continue;
    const ruta = join(rutaRoot, area);
    if (!(await existe(ruta))) continue;
    const relativo = `${root}/${area}/`;
    if (!(await contieneSoloScaffold(ruta))) {
      avisar('⚠️', `${relativo}: conservado (tiene contenido propio)`);
      continue;
    }
    if (!dryRun) await rm(ruta, { recursive: true, force: true });
    avisar('🧹', `${relativo}: scaffold no seleccionado eliminado`);
  }
}

// README, contexto y harness de la raíz: se crean solo si faltan y nunca se sobrescriben.
async function crearSiemprePresentes({ rutaRoot, root, textos, dryRun, avisar }) {
  const presentes = [
    { ruta: rutaRoot, relativo: `${root}/`, clase: 'directorio' },
    { ruta: join(rutaRoot, 'README.md'), relativo: `${root}/README.md`, clase: 'readme' },
    { ruta: join(rutaRoot, 'project-context.md'), relativo: `${root}/project-context.md`, clase: 'contexto' },
    { ruta: join(rutaRoot, 'harness'), relativo: `${root}/harness/`, clase: 'directorio' },
  ];
  for (const presente of presentes) {
    if (await existe(presente.ruta)) {
      avisar('⏭️', `${presente.relativo} ya existe`);
      continue;
    }
    if (!dryRun) {
      if (presente.clase === 'directorio') await mkdir(presente.ruta, { recursive: true });
      else await writeFile(presente.ruta, stub(textos[presente.clase]), 'utf8');
    }
    avisar('✅', `${presente.relativo} creado`);
  }
}

// Solo las secciones seleccionadas; las demás no se crean nunca.
async function crearSecciones({ proyecto, secciones, rutas, textos, dryRun, avisar }) {
  for (const area of secciones) {
    const ruta = rutas[area];
    const destino = join(proyecto, ruta, 'README.md');
    const relativo = `${ruta}/README.md`;
    if (await existe(destino)) {
      avisar('⏭️', `${relativo} ya existe`);
      continue;
    }
    if (!dryRun) {
      await mkdir(join(proyecto, ruta), { recursive: true });
      await writeFile(destino, stub(textos.secciones[area]), 'utf8');
    }
    avisar('✅', `${relativo} creado`);
  }
}

async function actualizarEnlaces({ proyecto, rutaRoot, root, rutas, secciones, dryRun, avisar }) {
  const rutasSeleccionadas = secciones.map((area) => rutas[area]);
  for (const nombre of ['README.md', 'README.en.md']) {
    const archivo = join(rutaRoot, nombre);
    if (!(await existe(archivo))) continue;
    const original = await readFile(archivo, 'utf8');
    const reescrito = reescribirPortada(original, { root, seleccionadas: rutasSeleccionadas });
    const relativo = `${root}/${nombre}`;
    if (reescrito === original) {
      avisar('⏭️', `${relativo} sin cambios`);
      continue;
    }
    if (!dryRun) await writeFile(archivo, reescrito, 'utf8');
    avisar('✅', `${relativo}: enlaces de documentación actualizados`);
  }

  const rutaAgents = join(proyecto, 'AGENTS.md');
  if (await existe(rutaAgents)) {
    const original = await readFile(rutaAgents, 'utf8');
    let reescrito = reescribirAgents(original, { root, secciones: rutasSeleccionadas, rutas });
    if (root !== ROOT_CANONICA) {
      reescrito = reescrito
        .split('`docs/project-context.md`')
        .join(`\`${root}/project-context.md\``)
        .split('(docs/project-context.md)')
        .join(`(${root}/project-context.md)`);
    }
    if (reescrito === original) {
      avisar('⏭️', 'AGENTS.md sin cambios');
    } else {
      if (!dryRun) await writeFile(rutaAgents, reescrito, 'utf8');
      avisar('✅', 'AGENTS.md: § Document map y § Preferences actualizados');
    }
  }

  // El README del proyecto es del usuario: se reescriben rutas, nunca filas.
  const rutaReadmeProyecto = join(proyecto, 'README.md');
  if (!(await existe(rutaReadmeProyecto))) return;
  const original = await readFile(rutaReadmeProyecto, 'utf8');
  const { texto, pendientes } = reescribirReadmeProyecto(original, {
    seleccionadas: new Map(secciones.map((area) => [area, rutas[area]])),
  });
  if (texto === original) {
    avisar('⏭️', 'README.md sin cambios');
  } else {
    if (!dryRun) await writeFile(rutaReadmeProyecto, texto, 'utf8');
    avisar('✅', 'README.md: rutas de documentación actualizadas');
  }
  for (const pendiente of pendientes) {
    avisar('⚠️', `README.md referencia ${pendiente} pero esa sección no está seleccionada`);
  }
}

export async function aplicarDocs({ proyecto = '.', dryRun = false, decision = null, log = console.log } = {}) {
  if (decision !== null && !DECISIONES.includes(decision)) {
    throw new Error(`decisión desconocida: ${decision}`);
  }
  const rutaEstado = join(proyecto, '.atlas/state.json');
  let estado;
  try {
    estado = JSON.parse(await readFile(rutaEstado, 'utf8'));
  } catch {
    throw new Error(`no se pudo leer ${rutaEstado}: el proyecto no está inicializado`);
  }

  const config = estado.docs ?? {};
  const idioma = estado.language?.user === 'en' ? 'en' : 'es';
  const bilingual = config.bilingual === true;
  const root = validarRuta(config.root ?? ROOT_CANONICA, 'docs.root');
  if (root.startsWith(`${ROOT_CANONICA}/`)) {
    throw new Error(`docs.root: "${root}" no puede estar dentro de ${ROOT_CANONICA}/`);
  }
  const rutas = {};
  for (const area of AREAS) {
    const valor = config[area];
    rutas[area] = valor === null || valor === undefined ? null : validarRuta(valor, `docs.${area}`);
  }
  const textos = TEXTOS[idioma];
  const secciones = AREAS.filter((area) => rutas[area] !== null);
  const rutaRoot = join(proyecto, root);
  const acciones = [];
  const avisar = (icono, mensaje) => {
    acciones.push(`${icono} ${mensaje}`);
    log(`${icono} ${mensaje}${dryRun ? ' (simulación)' : ''}`);
  };

  const { pendiente } = await resolverRaiz({
    proyecto,
    root,
    decision,
    modo: estado.mode ?? null,
    dryRun,
    avisar,
    log,
  });
  if (pendiente) {
    return { root, secciones: secciones.map((area) => rutas[area]), decision, dryRun, pendiente, acciones };
  }

  await resolverPortadas({
    rutaRoot,
    root,
    idioma,
    bilingual,
    modo: estado.mode ?? null,
    dryRun,
    avisar,
  });
  await limpiarScaffoldNoSeleccionado({
    rutaRoot,
    root,
    rutas,
    modo: estado.mode ?? null,
    dryRun,
    avisar,
  });
  await crearSiemprePresentes({ rutaRoot, root, textos, dryRun, avisar });
  await crearSecciones({ proyecto, secciones, rutas, textos, dryRun, avisar });
  await actualizarEnlaces({ proyecto, rutaRoot, root, rutas, secciones, dryRun, avisar });
  await ajustarEnlacesPortada({ proyecto, rutaRoot, root, dryRun, avisar });

  return {
    root,
    secciones: secciones.map((area) => rutas[area]),
    decision,
    dryRun,
    pendiente: false,
    acciones,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const valor = (flag) => {
    const indice = args.indexOf(flag);
    return indice === -1 ? undefined : args[indice + 1];
  };
  try {
    const elegidas = DECISIONES.filter((candidata) => args.includes(`--${candidata}`));
    if (elegidas.length > 1) {
      throw new Error(`elige una sola decisión: ${elegidas.map((opcion) => `--${opcion}`).join(', ')}`);
    }
    await aplicarDocs({
      proyecto: valor('--proyecto') ?? '.',
      dryRun: args.includes('--dry-run'),
      decision: elegidas[0] ?? null,
    });
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}
