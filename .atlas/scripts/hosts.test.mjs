// hosts.test.mjs — pruebas del registro único de hosts.
//
// Requisito: Node 20+ (node:test + node:assert/strict). Cero dependencias externas.
//
// Uso: node --test .atlas/scripts/hosts.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HOSTS, HOSTS_SOPORTADOS } from './lib/hosts.mjs';

test('cada host con adaptador declara sus directorios y coincide con su id', () => {
  for (const [id, host] of Object.entries(HOSTS)) {
    assert.equal(host.id, id, `${id}: el descriptor debe declarar su propio id`);
    assert.match(host.agentes, /^\./, `${id}: el directorio de agentes debe ser relativo`);
    assert.match(host.comandos, /^\./, `${id}: el directorio de comandos debe ser relativo`);
  }
});

test('la lista de soportados incluye a Cursor y coincide con el registro', () => {
  assert.ok(HOSTS_SOPORTADOS.includes('cursor'));
  assert.deepEqual([...HOSTS_SOPORTADOS].sort(), Object.keys(HOSTS).sort());
});

test('no hay rutas de host duplicadas', () => {
  const rutas = Object.values(HOSTS).flatMap((host) => [host.agentes, host.comandos]);
  assert.equal(new Set(rutas).size, rutas.length, 'dos hosts no pueden compartir directorio');
});

test('Cursor escribe subagentes y comandos en su propio árbol', () => {
  assert.equal(HOSTS.cursor.agentes, '.cursor/agents');
  assert.equal(HOSTS.cursor.comandos, '.cursor/commands');
});
