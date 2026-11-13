import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const POWERSHELL = "powershell.exe"

const PLAYER_SCRIPT = `param(
  [Parameter(Mandatory = $true)][string]$Path
)

$ErrorActionPreference = "Stop"
$player = $null

try {
  [Windows.Media.Playback.MediaPlayer, Windows.Media.Playback, ContentType = WindowsRuntime] | Out-Null
  [Windows.Media.Core.MediaSource, Windows.Media.Core, ContentType = WindowsRuntime] | Out-Null

  $player = [Windows.Media.Playback.MediaPlayer]::new()
  $player.Source = [Windows.Media.Core.MediaSource]::CreateFromUri([Uri]$Path)
  $player.Play()

  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  $duration = 0
  do {
    Start-Sleep -Milliseconds 50
    $duration = $player.PlaybackSession.NaturalDuration.TotalMilliseconds
  } while ($duration -le 0 -and [DateTime]::UtcNow -lt $deadline)

  if ($duration -le 0) {
    $player.Dispose()
    exit 5
  }

  Start-Sleep -Milliseconds ([int]$duration + 350)
  $player.Pause()
  $player.Dispose()
  exit 0
} catch {
  if ($null -ne $player) {
    try { $player.Dispose() } catch { }
  }
  Write-Error $_
  exit 4
}
`

export interface Playback {
  stop(): void
  done: Promise<boolean>
}

function workDir(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  return dir
}

function killTree(child: ChildProcess) {
  const pid = child.pid
  if (pid === undefined) {
    child.kill()
    return
  }
  const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
    windowsHide: true,
    stdio: "ignore",
  })
  killer.on("error", () => child.kill())
}

export function playMp3Base64(base64: string): Playback {
  if (process.platform !== "win32") {
    return { stop() {}, done: Promise.resolve(false) }
  }

  const id = randomUUID()
  const file = join(workDir(), `speech-${id}.mp3`)
  const script = join(workDir(), `speech-${id}.ps1`)
  writeFileSync(file, Buffer.from(base64, "base64"))
  writeFileSync(script, PLAYER_SCRIPT, "utf8")

  let child: ChildProcess | undefined
  let settled = false
  let resolveDone!: (ok: boolean) => void
  const done = new Promise<boolean>((resolve) => {
    resolveDone = resolve
  })

  const clean = () => {
    for (const path of [file, script]) {
      try {
        rmSync(path, { force: true })
      } catch {
        // Best effort: the temp folder is cleaned by the OS anyway.
      }
    }
  }

  const finish = (ok: boolean) => {
    if (settled) return
    settled = true
    clean()
    resolveDone(ok)
  }

  child = spawn(
    POWERSHELL,
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-Path", file],
    {
      windowsHide: true,
      stdio: "ignore",
    },
  )

  child.on("error", () => finish(false))
  child.on("close", (code) => finish(code === 0))

  return {
    stop() {
      if (settled) return
      if (child) killTree(child)
      finish(false)
    },
    done,
  }
}
