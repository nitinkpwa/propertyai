#Requires -Version 5.1
<#
.SYNOPSIS
  Permanent Windows Git lock mitigation for AreaIQ / propertyai.

.DESCRIPTION
  1) Applies repo-local Git performance settings safe for Windows.
  2) Optionally adds Windows Defender exclusions (requires elevation).
  3) Verifies repository integrity (fsck / status).

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts/setup-windows-git.ps1
    powershell -ExecutionPolicy Bypass -File scripts/setup-windows-git.ps1 -WithDefender
#>
[CmdletBinding()]
param(
  [switch]$WithDefender
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Set-LocalGit {
  param([string]$Name, [string]$Value)
  git config --local $Name $Value | Out-Null
  Write-Host ("  git config --local {0}={1}" -f $Name, $Value)
}

Write-Host ""
Write-Host "=== AreaIQ Windows Git setup ==="
Write-Host ("Repo: {0}" -f $Root)
Write-Host ""

Write-Host "Applying local Git settings..."
Set-LocalGit "core.fscache" "true"
Set-LocalGit "core.preloadindex" "true"
Set-LocalGit "core.untrackedCache" "true"
Set-LocalGit "core.longpaths" "true"
Set-LocalGit "core.fsmonitor" "true"
Set-LocalGit "advice.useCoreFSMonitorConfig" "false"
Set-LocalGit "feature.manyFiles" "true"
Set-LocalGit "gc.auto" "256"
Set-LocalGit "gc.autoDetach" "true"
Set-LocalGit "pack.threads" "1"
Set-LocalGit "index.threads" "true"

if ($WithDefender) {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )
  if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: -WithDefender requires an elevated PowerShell (Run as Administrator)." -ForegroundColor Red
    exit 1
  }

  $paths = @(
    (Join-Path $Root ".git"),
    (Join-Path $Root "node_modules"),
    (Join-Path $Root ".next"),
    (Join-Path $Root ".open-next"),
    (Join-Path $Root ".wrangler")
  )

  Write-Host ""
  Write-Host "Adding Windows Defender exclusions..."
  foreach ($p in $paths) {
    if (-not (Test-Path $p)) {
      Write-Host ("  skip (missing): {0}" -f $p)
      continue
    }
    try {
      Add-MpPreference -ExclusionPath $p -ErrorAction Stop
      Write-Host ("  excluded: {0}" -f $p)
    } catch {
      Write-Host ("  failed: {0} - {1}" -f $p, $_.Exception.Message) -ForegroundColor Yellow
    }
  }
} else {
  Write-Host ""
  Write-Host "Skipping Defender exclusions (re-run with -WithDefender as Administrator)."
}

Write-Host ""
Write-Host "Verifying repository..."
git status --short
git remote -v
git fsck --no-full

Write-Host ""
Write-Host "Done. Reload the Cursor/VS Code window so watcher exclusions take effect."
Write-Host "Prefer a single IDE open on this repo (Cursor OR VS Code, not both)."
Write-Host ""
