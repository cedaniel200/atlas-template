#!/usr/bin/env node
// medir-contexto.mjs — estima el coste de contexto estático del arnés.
//
// HERRAMIENTA DE MANTENIMIENTO: no es un gate y no se ejecuta en el bootstrap.
// Sirve para (a) comprobar que el arnés no engorda y (b) comparar antes/después
// de un cambio. Un equipo puede usarla si añade skills, agentes o packs propios.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// Proxy de tokens: ceil(caracteres / 4). Es una estimación, no el tokenizer del
// modelo; en español puede llegar a ~3,5 caracteres/token (+15%). No incluye
// conversación, tool outputs ni contenido generado en runtime.
//
// Uso:
//   node .atlas/scripts/medir-contexto.mjs          # informe legible
//   node .atlas/scripts/medir-contexto.mjs --json   # línea base comparable

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PROXY = 4;
const json = process.argv.includes('--json');
const log = json ? () => {} : (...args) => console.log(...args);

async function expandir(patron) {
  const segmentos = patron.split('/');
  let actuales = ['.'];

  for (const segmento of segmentos) {
    const siguientes = [];
    for (const base of actuales) {
      if (segmento === '**') {
        siguientes.push(base);
        const pendientes = [base];
        while (pendientes.length > 0) {
          const dir = pendientes.pop();
          let entradas;
          try {
            entradas = await readdir(dir, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const entrada of entradas) {
            if (entrada.isDirectory()) {
              const ruta = join(dir, entrada.name);
              siguientes.push(ruta);
              pendientes.push(ruta);
            }
          }
        }
        continue;
      }

      let entradas;
      try {
        entradas = await readdir(base, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entrada of entradas) {
        const ruta = join(base, entrada.name);
        if (segmento === '*') {
          siguientes.push(ruta);
        } else if (segmento.startsWith('*')) {
          const sufijo = segmento.slice(1);
          if (entrada.isFile() && entrada.name.endsWith(sufijo)) siguientes.push(ruta);
        } else if (entrada.name === segmento) {
          siguientes.push(ruta);
        }
      }
    }
    actuales = siguientes;
  }

  return [...new Set(actuales)];
}

async function tamano(ruta) {
  try {
    const texto = await readFile(ruta, 'utf8');
    return { ruta, caracteres: texto.length, tokens: Math.ceil(texto.length / PROXY), texto };
  } catch {
    return null;
  }
}

function frontmatter(texto) {
  const coincidencia = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!coincidencia) return '';
  return coincidencia[1]
    .split(/\r?\n/)
    .filter((linea) => /^(name|description):/.test(linea))
    .join('\n');
}

async function medirPatrones(patrones, excluir = []) {
  const vistos = new Set();
  const filas = [];
  for (const patron of patrones) {
    for (const ruta of await expandir(patron)) {
      if (vistos.has(ruta) || excluir.includes(ruta)) continue;
      vistos.add(ruta);
      const medida = await tamano(ruta);
      if (medida) filas.push(medida);
    }
  }
  return filas;
}

function total(filas) {
  return {
    caracteres: filas.reduce((suma, fila) => suma + fila.caracteres, 0),
    tokens: filas.reduce((suma, fila) => suma + fila.tokens, 0),
  };
}

function imprimir(titulo, filas) {
  const { caracteres, tokens } = total(filas);
  log(`\n## ${titulo}`);
  for (const fila of [...filas].sort((a, b) => b.tokens - a.tokens)) {
    log(
      `  ${fila.ruta.padEnd(52)} ${String(fila.caracteres).padStart(8)} car  ~${String(fila.tokens).padStart(6)} tok`,
    );
  }
  log(`  ${'TOTAL'.padEnd(52)} ${String(caracteres).padStart(8)} car  ~${String(tokens).padStart(6)} tok`);
  return tokens;
}

const AGENTES = '.atlas/agents/*.md';
const SKILLS = '.agents/skills/*/SKILL.md';

// Política de medición:
// - Base: AGENTS + CLAUDE + host activo + descripciones de skills.
// - Arranque mínimo: lo que el bootstrap necesita (BOOTSTRAP, AGENTS, config, placeholders, README base, host).
// - Arranque completo: + prompts de agente activos (core + opcionales en state.optional_agents).
// - Techo: todo el arnés, incluidas referencias on-demand y prompts opcionales.
// Fuera de la medición: READMEs de mantenimiento, _templates, _examples y hosts no activos.
let estado = {};
try {
  estado = JSON.parse(await readFile('.atlas/state.json', 'utf8'));
} catch {
  // template sin estado
}
const opcionalesActivos = new Set(Array.isArray(estado.optional_agents) ? estado.optional_agents : []);
const host = estado.host;
const hostConfig = host === 'claude' || host === 'codex'
  ? null
  : ((await expandir('opencode.json')).length > 0 ? 'opencode.json' : '.atlas/hosts/opencode/opencode.json');
const patronesHost = hostConfig ? [hostConfig] : [];

const arranqueMinimo = await medirPatrones([
  '.atlas/BOOTSTRAP.md',
  'AGENTS.md',
  'openspec/config.yaml',
  '.atlas/PLACEHOLDERS.md',
  '.atlas/PROJECT-README.md',
  ...patronesHost,
]);

const agentesCanonicos = await medirPatrones([AGENTES], ['.atlas/agents/README.md']);
const esOpcional = (fila) => fila.texto.trimStart().startsWith('<!-- optional-role -->');
const rolDe = (fila) => fila.ruta.split('/').at(-1).replace(/\.md$/, '');
const agentesActivos = agentesCanonicos.filter(
  (fila) => !esOpcional(fila) || opcionalesActivos.has(rolDe(fila)),
);

const arranque = [
  ...(await medirPatrones([
    '.atlas/BOOTSTRAP.md',
    'AGENTS.md',
    'openspec/config.yaml',
    '.atlas/PLACEHOLDERS.md',
    '.atlas/PROJECT-README.md',
    ...patronesHost,
  ])),
  ...agentesActivos,
];

const nombresSkills = (await expandir(SKILLS)).map((ruta) => ruta.split('/').at(-2)).sort();
const skills = await medirPatrones([SKILLS]);
let descripciones = 0;
for (const fila of skills) descripciones += frontmatter(fila.texto).length;

const base = await medirPatrones(['AGENTS.md', 'CLAUDE.md', ...patronesHost]);
const baseConSkills = [
  ...base,
  {
    ruta: `descripciones de ${nombresSkills.length} skills (discovery)`,
    caracteres: descripciones,
    tokens: Math.ceil(descripciones / PROXY),
  },
];

log('Coste de contexto del arnés (estimación estática)');
log('Proxy: ~4 caracteres/token (en español puede llegar a ~3,5 → hasta +15%).');
log('No incluye conversación ni tool outputs.');
imprimir('Arranque mínimo del ritual (sin leer prompts de agente)', arranqueMinimo);
imprimir('Arranque completo (si además lee los prompts de agente activos)', arranque);
const tokensBase = imprimir('Contexto base de sesión (siempre)', baseConSkills);

const adaptadores = [
  ...(await expandir('.opencode/agent/*.md')),
  ...(await expandir('.claude/agents/*.md')),
];
const fuenteAgentes = adaptadores.length > 0 ? 'adaptadores del host' : 'prompts canónicos';
const agentes = adaptadores.length > 0
  ? await medirPatrones(['.opencode/agent/*.md', '.claude/agents/*.md'])
  : agentesActivos;
log(`\n## Por agente (base + prompt + núcleo de skills) — fuente: ${fuenteAgentes}`);
const porAgente = [];
for (const agente of agentes.sort((a, b) => a.ruta.localeCompare(b.ruta))) {
  const mencionadas = [...agente.texto.matchAll(/`([a-z0-9-]+)`/g)]
    .map((coincidencia) => coincidencia[1])
    .filter((nombre) => nombresSkills.includes(nombre));
  const unicas = [...new Set(mencionadas)];
  let caracteresSkills = 0;
  for (const nombre of unicas) {
    const medida = await tamano(`.agents/skills/${nombre}/SKILL.md`);
    if (medida) caracteresSkills += medida.caracteres;
  }
  const tokens = tokensBase + Math.ceil((agente.caracteres + caracteresSkills) / PROXY);
  porAgente.push({ archivo: agente.ruta.split('/').at(-1), tokens, skills: unicas.length });
  log(
    `  ${agente.ruta.split('/').at(-1).padEnd(20)} ~${String(tokens).padStart(6)} tok  (${unicas.length} skills)`,
  );
}

const todasLasSkills = await medirPatrones(['.agents/skills/**/*.md']);
const techo =
  tokensBase +
  Math.ceil(todasLasSkills.reduce((total, fila) => total + fila.caracteres, 0) / PROXY) +
  Math.ceil(agentesCanonicos.reduce((total, fila) => total + fila.caracteres, 0) / PROXY);
log(`\n## Techo (todo el arnés cargado a la vez, incl. referencias on-demand)\n  ~${techo} tok`);

const cota = (tokens) => Math.ceil(tokens * 1.15);
log('\n## Resumen (tokens, cota superior +15%)');
log(`  Base de sesión:        ~${tokensBase} (≤${cota(tokensBase)})`);
log(`  Arranque mínimo:       ~${arranqueMinimo.reduce((t, f) => t + f.tokens, 0)} (≤${cota(arranqueMinimo.reduce((t, f) => t + f.tokens, 0))})`);
log(`  Arranque completo:     ~${arranque.reduce((t, f) => t + f.tokens, 0)} (≤${cota(arranque.reduce((t, f) => t + f.tokens, 0))})`);
log(`  Techo del arnés:       ~${techo} (≤${cota(techo)})`);

if (json) {
  console.log(JSON.stringify({
    proxy: 'chars/4',
    fuenteAgentes,
    baseSesion: total(baseConSkills),
    arranqueMinimo: total(arranqueMinimo),
    arranqueCompleto: total(arranque),
    porAgente,
    techo,
  }, null, 2));
}
