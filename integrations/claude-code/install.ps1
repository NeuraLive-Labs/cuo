# CUO for Claude Code — local install (Windows)
# Copies plugin files to ~/.cuo/claude-code and merges hooks + statusLine into ~/.claude/settings.json
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest = Join-Path $HOME '.cuo\claude-code'
$ClaudeDir = Join-Path $HOME '.claude'
$SettingsPath = Join-Path $ClaudeDir 'settings.json'

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
New-Item -ItemType Directory -Force -Path $ClaudeDir | Out-Null

Copy-Item -Recurse -Force (Join-Path $Root '*') $Dest

$HookCmd = 'node "' + (Join-Path $Dest 'scripts\cuo-hook.mjs') + '" {event}'
$StatusCmd = 'node "' + (Join-Path $Dest 'scripts\cuo-statusline.mjs') + '"'

$settings = @{}
if (Test-Path $SettingsPath) {
  try {
    $settings = Get-Content -Raw -Path $SettingsPath | ConvertFrom-Json -AsHashtable
  } catch {
    Write-Warning "Could not parse existing settings.json; creating cuo-settings.snippet.json instead."
    $snippet = Join-Path $Dest 'cuo-settings.snippet.json'
    @{
      hooks = @{
        SessionStart = @(@{ hooks = @(@{ type = 'command'; command = ($HookCmd -replace '\{event\}','SessionStart') }) })
        SessionEnd = @(@{ hooks = @(@{ type = 'command'; command = ($HookCmd -replace '\{event\}','SessionEnd'); timeout = 5 }) })
        UserPromptSubmit = @(@{ hooks = @(@{ type = 'command'; command = ($HookCmd -replace '\{event\}','UserPromptSubmit') }) })
        PostToolUse = @(@{ hooks = @(@{ type = 'command'; command = ($HookCmd -replace '\{event\}','PostToolUse') }) })
        Stop = @(@{ hooks = @(@{ type = 'command'; command = ($HookCmd -replace '\{event\}','Stop') }) })
      }
      statusLine = @{ type = 'command'; command = $StatusCmd; padding = 2 }
    } | ConvertTo-Json -Depth 12 | Set-Content -Path $snippet -Encoding UTF8
    Write-Host "Wrote snippet: $snippet"
    Write-Host "Merge manually into $SettingsPath"
    exit 0
  }
}

if (-not $settings.hooks) { $settings.hooks = @{} }

function Add-CuoHook([string]$Event) {
  $cmd = $HookCmd -replace '\{event\}', $Event
  $entry = @{
    hooks = @(
      @{
        type = 'command'
        command = $cmd
      }
    )
  }
  if ($Event -eq 'SessionEnd') { $entry.hooks[0].timeout = 5 }
  if (-not $settings.hooks[$Event]) { $settings.hooks[$Event] = @() }
  $existing = @($settings.hooks[$Event])
  $filtered = @($existing | Where-Object {
    $cmds = @($_.hooks | ForEach-Object { $_.command })
    -not ($cmds -join ' ').Contains('cuo-hook.mjs')
  })
  $settings.hooks[$Event] = @($filtered + $entry)
}

foreach ($ev in @('SessionStart','SessionEnd','UserPromptSubmit','PostToolUse','Stop')) {
  Add-CuoHook $ev
}

$settings.statusLine = @{
  type = 'command'
  command = $StatusCmd
  padding = 2
}

($settings | ConvertTo-Json -Depth 20) | Set-Content -Path $SettingsPath -Encoding UTF8

# Skill copy for Claude Code skills folder
$SkillDest = Join-Path $ClaudeDir 'skills\cuo'
New-Item -ItemType Directory -Force -Path $SkillDest | Out-Null
Copy-Item -Force (Join-Path $Dest 'skills\cuo\SKILL.md') (Join-Path $SkillDest 'SKILL.md')

Write-Host "CUO Claude Code integration installed."
Write-Host "  Plugin copy: $Dest"
Write-Host "  Settings:    $SettingsPath"
Write-Host "  Telemetry:   $(Join-Path $HOME '.cuo\telemetry')"
Write-Host "Restart Claude Code (or start a new session) to load hooks/statusline."
