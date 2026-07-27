# Windows Git File-Lock Hardening (AreaIQ)

## Symptom

After `git push` / `git fetch` / `git gc`:

```text
Deletion of directory '.git/refs/remotes/origin' failed. Should I try again? (y/n)
Deletion of directory '.git/objects/00' failed. Should I try again? (y/n)
```

The repository is healthy; Windows holds a directory handle inside `.git` so `RemoveDirectory` fails.

## Root cause

On this machine the lock is produced by **overlapping readers of `.git`**, not by corrupt objects:

1. **Cursor + VS Code both open** on the same folder — each runs SCM + file watchers that touch `.git/refs` and `.git/objects`.
2. **No workspace `files.watcherExclude` for `.git`** (was missing entirely).
3. **Windows Defender (`MsMpEng`) + Search Indexer** scan newly written pack/ref files during prune/gc and briefly lock directories.
4. Secondary I/O load from `next dev` (does not lock `.git` itself, but increases contention during prune).

There are **no custom Git hooks**, and no npm/Wrangler/Supabase watcher pointed at `.git`.

## Permanent fix (applied in-repo)

| Change | Purpose |
|---|---|
| `.vscode/settings.json` | Exclude `.git` from watchers, search, and explorer |
| `.cursorignore` | Keep Cursor indexing off `.git` / build trees |
| `git config --local` (via setup script) | Windows-safe fscache / fsmonitor / gc settings |
| Defender exclusions (admin, optional) | Stop real-time AV from locking prune targets |

### One-time setup

```powershell
# From repo root (normal shell):
powershell -ExecutionPolicy Bypass -File scripts/setup-windows-git.ps1

# Elevated PowerShell (recommended once):
powershell -ExecutionPolicy Bypass -File scripts/setup-windows-git.ps1 -WithDefender
```

### Manual Defender exclusions (Admin PowerShell)

```powershell
Add-MpPreference -ExclusionPath "D:\Property\propertyai\.git"
Add-MpPreference -ExclusionPath "D:\Property\propertyai\node_modules"
Add-MpPreference -ExclusionPath "D:\Property\propertyai\.next"
Add-MpPreference -ExclusionPath "D:\Property\propertyai\.open-next"
Add-MpPreference -ExclusionPath "D:\Property\propertyai\.wrangler"
```

### Windows Search

Settings → Privacy & security → Searching Windows → Advanced indexing options → Modify  
→ uncheck `D:\Property\propertyai` (or at least ensure `.git` is not crawled).

## Operational rule (required)

Keep **one** editor workspace open on this repo:

- Use **Cursor** *or* **VS Code**, not both at once on `D:\Property\propertyai`.

Dual IDE watchers reintroduce the same handle contention even with exclusions.

## Local Git settings (expected)

```text
core.fscache=true
core.preloadindex=true
core.untrackedCache=true
core.longpaths=true
core.fsmonitor=true
feature.manyFiles=true
gc.auto=256
gc.autoDetach=true
pack.threads=1
index.threads=true
```

System Git already had `core.fscache=true` and `core.autocrlf=true`.

## Verify

```powershell
git status
git remote -v
git fsck --no-full
git gc
git fetch
git push
```

None of these should prompt `Should I try again? (y/n)`.

If a prompt still appears once after applying Defender exclusions, answer `n`, reload the IDE window, and retry — residual handles clear after watcher restart.
