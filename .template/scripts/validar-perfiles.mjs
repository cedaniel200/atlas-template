#!/usr/bin/env node
// validar-perfiles.mjs — valida los perfiles de stack del template.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas:
// no usa Python, PyYAML, jq ni yq.
//
// Uso:
//   node .template/scripts/validar-perfiles.mjs           # estructural (siempre)
//   node .template/scripts/validar-perfiles.mjs --deep    # exige parseo YAML real
//
// El parseo YAML se ejecuta automáticamente si el paquete "yaml" es resoluble
// (p. ej. `npm i yaml` en el proyecto). Si no, se omite con un aviso visible.
//
// Salida: 0 = ok; 1 = hallazgos (o falta el parser con --deep).

import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = '.template/profiles';
const CLAVES_OBLIGATORIAS = ['name', 'description', 'stack', 'structure', 'commands'];
const COMANDOS_OBLIGATORIOS = ['install', 'build', 'test'];
const exigirProfundo = process.argv.includes('--deep');

async function buscarPerfiles(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const encontrados = [];
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...(await buscarPerfiles(ruta)));
    } else if (entrada.isFile() && entrada.name.endsWith('.yaml')) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

function validarEstructura(ruta, texto) {
  const errores = [];
  const lineas = texto.split('\n');

  // YAML prohíbe tabulaciones en la indentación.
  if (lineas.some((linea) => /^[ ]*\t/.test(linea))) {
    errores.push('usa tabulaciones en la indentación (YAML las prohíbe)');
  }

  const claves = new Set(
    lineas
      .map((linea) => linea.match(/^([A-Za-z_][\w-]*):/))
      .filter(Boolean)
      .map((coincidencia) => coincidencia[1]),
  );
  for (const clave of CLAVES_OBLIGATORIAS) {
    if (!claves.has(clave)) {
      errores.push(`falta la clave de primer nivel "${clave}:"`);
    }
  }

  const nombre = (texto.match(/^name:\s*["']?([^"'\s#]+)["']?\s*$/m) || [])[1];
  const esperado = basename(ruta, '.yaml');
  if (!nombre) {
    errores.push('no declara "name:"');
  } else if (nombre !== esperado) {
    errores.push(`name "${nombre}" no coincide con el archivo "${esperado}.yaml"`);
  }

  const bloqueComandos = texto.split(/^commands:\s*(?:#.*)?$/m)[1];
  if (bloqueComandos === undefined) {
    errores.push('falta el bloque "commands:"');
  } else {
    const cuerpo = bloqueComandos.split(/^\S/m)[0];
    for (const comando of COMANDOS_OBLIGATORIOS) {
      if (!new RegExp(`^\\s+${comando}:`, 'm').test(cuerpo)) {
        errores.push(`commands: falta "${comando}:"`);
      }
    }
  }

  return errores;
}

function cargarParserYaml() {
  try {
    return createRequire(import.meta.url)('yaml');
  } catch {
    return null;
  }
}

let archivos;
try {
  archivos = await buscarPerfiles(RAIZ);
} catch {
  console.error(`❌ no se pudo leer ${RAIZ}`);
  process.exit(1);
}

if (archivos.length === 0) {
  console.error(`❌ no se encontró ningún perfil .yaml bajo ${RAIZ} (¿carpeta movida?)`);
  process.exit(1);
}

const parser = cargarParserYaml();
if (!parser && exigirProfundo) {
  console.error('❌ --deep exige el paquete "yaml" y no está disponible. Instálalo con: npm i yaml');
  process.exit(1);
}

let conHallazgos = 0;
for (const archivo of archivos.sort()) {
  const texto = await readFile(archivo, 'utf8');
  const errores = validarEstructura(archivo, texto);

  if (parser) {
    try {
      const documento = parser.parse(texto);
      if (!documento || typeof documento !== 'object') {
        errores.push('el YAML no produce un objeto');
      }
    } catch (error) {
      errores.push(`YAML inválido: ${String(error.message).split('\n')[0]}`);
    }
  }

  if (errores.length > 0) {
    conHallazgos += 1;
    console.error(`❌ ${relative('.', archivo)}`);
    for (const error of errores) {
      console.error(`   - ${error}`);
    }
  } else {
    console.log(`✅ ${relative('.', archivo)}`);
  }
}

console.log(`\n${archivos.length} perfil(es) revisado(s); ${conHallazgos} con hallazgos.`);
console.log(
  parser
    ? 'Validación: estructural + parseo YAML.'
    : 'Validación: estructural. ⚠️  Parseo YAML omitido (paquete "yaml" no disponible).',
);

process.exit(conHallazgos === 0 ? 0 : 1);
