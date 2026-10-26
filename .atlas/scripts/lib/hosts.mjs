// hosts.mjs — registro único de hosts con adaptadores de subagente.
//
// Requisito: Node 20+ (declarado en el template). Cero dependencias externas.
//
// El renderer, el actualizador, el validador de contrato, el medidor de contexto y
// el inventario derivan de aquí sus rutas y mensajes. Añadir un host es añadir una
// entrada: sin condiciones duplicadas que puedan divergir.
//
// Codex no figura: no tiene subagentes ni directorios de adaptador propios; sus
// comandos los genera OpenSpec en `.codex/prompts/`.

export const HOSTS = {
  opencode: { id: 'opencode', agentes: '.opencode/agent', comandos: '.opencode/commands' },
  claude: { id: 'claude', agentes: '.claude/agents', comandos: '.claude/commands' },
  cursor: { id: 'cursor', agentes: '.cursor/agents', comandos: '.cursor/commands' },
};

export const HOSTS_SOPORTADOS = Object.keys(HOSTS);
