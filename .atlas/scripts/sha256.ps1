#Requires -Version 5.1
<#
.SYNOPSIS
    Hash portable para el manifiesto del template (Windows/PowerShell).

.DESCRIPTION
    Contrato: imprime SOLO el hash (64 hex, minúsculas), sin nombre de archivo.
    Equivalente a .atlas/scripts/sha256.sh.

.EXAMPLE
    powershell -NoProfile -File .atlas/scripts/sha256.ps1 .atlas/BOOTSTRAP.md
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $Path
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Write-Error "no existe el archivo: $Path"
    exit 2
}

# Get-FileHash emite MAYÚSCULAS; el contrato exige minúsculas.
(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
