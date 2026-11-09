import { spawn, type ChildProcess } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { SPEAK_SCRIPT } from "./speak-script"

const POWERSHELL = "powershell.exe"

export interface SpeakInput {
  text: string
  rate: number
  voice: string
}

export interface SpeakHandle {
  stop(): void
}

function workDir(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  return dir
}

function scriptFile(): string {
  const hash = createHash("sha1").update(SPEAK_SCRIPT).digest("hex").slice(0, 12)
  const file = join(workDir(), `speak-${hash}.ps1`)
  writeFileSync(file, SPEAK_SCRIPT, "utf8")
  return file
}

function textFile(text: string): string {
  const file = join(workDir(), `speech-${randomUUID()}.txt`)
  writeFileSync(file, text, "utf8")
  return file
}

function spawnPowershell(args: string[]): ChildProcess {
  return spawn(POWERSHELL, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
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

/** Maps the Web Speech `rate` scale (0.1–10, 1 = normal) to SAPI's -10…10. */
function sapiRate(rate: number): number {
  return Math.max(-10, Math.min(10, Math.round((rate - 1) * 5)))
}

export function speakSapi(input: SpeakInput, onDone: (ok: boolean) => void): SpeakHandle {
  const file = textFile(input.text)

  const child = spawnPowershell([
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptFile(),
    "-TextFile",
    file,
    "-Rate",
    String(sapiRate(input.rate)),
    "-Voice",
    input.voice,
  ])

  let stopped = false

  const clean = () => {
    try {
      rmSync(file, { force: true })
    } catch {
      // Best effort: the temp folder is cleaned by the OS anyway.
    }
  }

  child.on("error", () => {
    clean()
    if (!stopped) onDone(false)
  })

  child.on("close", (code) => {
    clean()
    if (!stopped) onDone(code === 0)
  })

  return {
    stop() {
      stopped = true
      killTree(child)
      clean()
    },
  }
}

export function listSapiVoices(): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawnPowershell([
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptFile(),
      "-ListVoices",
    ])

    let stdout = ""
    let settled = false

    const finish = (names: string[]) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(names)
    }

    const timer = setTimeout(() => {
      killTree(child)
      finish([])
    }, 10000)

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.on("error", () => finish([]))
    child.on("close", () => {
      const names = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      finish(names)
    })
  })
}
