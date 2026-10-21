#!/bin/sh
# sha256.sh — hash portable para el manifiesto del template.
#
# Contrato: imprime SOLO el hash (64 hex, minúsculas), sin nombre de archivo.
# Orden de herramientas: sha256sum (Linux/Git Bash) -> shasum -a 256 (macOS/Perl)
#                       -> openssl (fallback POSIX).
#
# Uso: sh .template/scripts/sha256.sh <archivo>
set -eu

if [ "$#" -ne 1 ]; then
    echo "uso: $0 <archivo>" >&2
    exit 2
fi

archivo=$1
if [ ! -f "$archivo" ]; then
    echo "no existe el archivo: $archivo" >&2
    exit 2
fi

if command -v sha256sum >/dev/null 2>&1; then
    hash=$(sha256sum "$archivo" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
    hash=$(shasum -a 256 "$archivo" | awk '{print $1}')
elif command -v openssl >/dev/null 2>&1; then
    hash=$(openssl dgst -sha256 -r "$archivo" | awk '{print $1}')
else
    echo "No se encontró sha256sum, shasum ni openssl." >&2
    echo "En Windows usa Git Bash o WSL (recomendado), o el helper .ps1 desde PowerShell." >&2
    exit 127
fi

# Normaliza a minúsculas: shasum/sha256sum ya lo son, openssl también; la
# normalización protege ante variantes que emitan mayúsculas.
printf '%s\n' "$hash" | tr 'A-F' 'a-f'
