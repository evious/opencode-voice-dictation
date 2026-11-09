import { spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { DiagnoseResult } from "../contract"
import { DICTATION_SCRIPT } from "./script"

export interface EngineOptions {
  locale: string
  minConfidence: number
}

export interface EngineCallbacks {
  onReady(locale: string): void
  onFinal(text: string, confidence: number): void
  onError(code: string, detail: string, available: string[]): void
  onExit(code: number | null, detail: string): void
}

export interface EngineHandle {
  stop(): void
}

interface EngineEvent {
  type?: string
  locale?: string
  text?: string
  confidence?: number
  code?: string
  detail?: string
  available?: string[]
}

const POWERSHELL = "powershell.exe"

function scriptFile(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  const hash = createHash("sha1").update(DICTATION_SCRIPT).digest("hex").slice(0, 12)
  const file = join(dir, `dictation-${hash}.ps1`)
  writeFileSync(file, DICTATION_SCRIPT, "utf8")
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

export function startEngine(options: EngineOptions, callbacks: EngineCallbacks): EngineHandle {
  const child = spawnPowershell([
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptFile(),
    "-Culture",
    options.locale,
    "-MinConfidence",
    String(options.minConfidence),
  ])

  let stopped = false
  let stderr = ""
  let buffer = ""

  const emit = (event: EngineEvent) => {
    switch (event.type) {
      case "ready":
        callbacks.onReady(event.locale ?? options.locale)
        break
      case "final":
        if (event.text) callbacks.onFinal(event.text, event.confidence ?? 0)
        break
      case "error":
        callbacks.onError(event.code ?? "UNKNOWN", event.detail ?? "", event.available ?? [])
        break
    }
  }

  child.stdout?.setEncoding("utf8")
  child.stdout?.on("data", (chunk: string) => {
    buffer += chunk
    let index = buffer.indexOf("\n")
    while (index >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, "").trim()
      buffer = buffer.slice(index + 1)
      if (line) {
        try {
          emit(JSON.parse(line) as EngineEvent)
        } catch {
          // A partial or unexpected line: ignore it and keep the stream alive.
        }
      }
      index = buffer.indexOf("\n")
    }
  })

  child.stderr?.setEncoding("utf8")
  child.stderr?.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-2000)
  })

  child.on("error", (cause) => {
    if (stopped) return
    callbacks.onError("ENGINE_START_FAILED", cause.message, [])
  })

  child.on("close", (code) => {
    if (stopped) return
    callbacks.onExit(code, stderr.trim().slice(-500))
  })

  return {
    stop() {
      stopped = true
      killTree(child)
    },
  }
}

export function diagnose(): Promise<DiagnoseResult> {
  return new Promise((resolve, reject) => {
    const child = spawnPowershell([
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptFile(),
      "-Diagnose",
    ])

    let stdout = ""
    let stderr = ""
    let settled = false

    const finish = (error: Error | undefined, value?: DiagnoseResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(value as DiagnoseResult)
    }

    const timer = setTimeout(() => {
      killTree(child)
      finish(new Error("diagnose timed out"))
    }, 20000)

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", (cause) => finish(cause))
    child.on("close", () => {
      const line = stdout
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.startsWith("{"))
        .at(-1)

      if (!line) {
        finish(new Error(stderr.trim() || "no output from PowerShell"))
        return
      }

      try {
        const parsed = JSON.parse(line) as DiagnoseResult
        finish(undefined, {
          locales: parsed.locales ?? [],
          microphone: parsed.microphone === true,
          selected: parsed.selected ?? "",
          error: parsed.error ?? "",
        })
      } catch (cause) {
        finish(cause instanceof Error ? cause : new Error(String(cause)))
      }
    })
  })
}
