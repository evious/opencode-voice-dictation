import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const DEFAULT_PYTHON = "~/peopleby/voice_to_text/api_voice/demo/whisperx-env/bin/python"

export interface WhisperInput {
  audio: string
  mime: string
  language: string
  python: string
  model: string
}

export interface WhisperResult {
  text: string
  language: string
}

export interface WhisperStatus {
  ready: boolean
  model: string
  device: string
  error: string
}

function workerPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "worker.py")
}

/** Converts a Windows path to the WSL mount path, e.g. C:\a\b -> /mnt/c/a/b. */
function toWslPath(path: string): string {
  if (process.platform !== "win32") return path

  return path
    .replace(/^([A-Za-z]):[\\/]/, (_, drive: string) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/")
}

function spawnWorker(python: string, model: string): ChildProcess {
  const env = { ...process.env, WHISPER_MODEL: model, WHISPER_DEVICE: "cuda" }

  // Inside `bash -lc`, a quoted `~` does not expand. Use $HOME instead.
  const pythonArg = python.startsWith("~/") ? `"$HOME/${python.slice(2)}"` : `"${python}"`
  const command = `${pythonArg} "${toWslPath(workerPath())}"`

  if (process.platform === "win32") {
    return spawn("wsl.exe", ["-d", "Ubuntu-22.04", "-e", "bash", "-lc", command], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
  }

  return spawn("bash", ["-lc", command], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  })
}

interface Waiter {
  resolve: (value: WhisperResult) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

export class WhisperEngine {
  private child: ChildProcess | undefined
  private readyPromise: Promise<void> | undefined
  private readyResolve: (() => void) | undefined
  private readyReject: ((error: Error) => void) | undefined
  private buffer = ""
  private stderr = ""
  private waiters = new Map<string, Waiter>()
  private status: WhisperStatus = {
    ready: false,
    model: "",
    device: "cuda",
    error: "",
  }
  private python = ""
  private model = ""

  private start(python: string, model: string): Promise<void> {
    this.stop()
    this.python = python || DEFAULT_PYTHON
    this.model = model || "large-v3-turbo"
    this.status = { ready: false, model: this.model, device: "cuda", error: "" }
    this.stderr = ""

    const child = spawnWorker(this.python, this.model)
    this.child = child

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })

    const timer = setTimeout(() => {
      this.status.error = "Whisper took too long to load the model"
      this.readyReject?.(new Error(this.status.error))
      this.stop()
    }, 180000)

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => this.onStdout(chunk, timer))

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      this.stderr = (this.stderr + chunk).slice(-3000)
    })

    child.on("error", (error) => {
      clearTimeout(timer)
      this.status.error = error.message
      this.readyReject?.(error)
      this.failWaiters(error)
    })

    child.on("close", (code) => {
      clearTimeout(timer)
      const detail = this.stderr.trim()

      if (!this.status.ready) {
        this.status = {
          ready: false,
          model: this.model,
          device: "cuda",
          error: detail || `Whisper worker exited with code ${code ?? "unknown"}`,
        }
        this.readyReject?.(new Error(this.status.error))
      } else {
        this.status = {
          ready: false,
          model: this.model,
          device: "cuda",
          error: detail || `Whisper worker exited with code ${code ?? "unknown"}`,
        }
      }

      this.failWaiters(new Error(this.status.error || "Whisper worker stopped"))
      this.child = undefined
      this.readyPromise = undefined
    })

    return this.readyPromise
  }

  private onStdout(chunk: string, timer: NodeJS.Timeout) {
    this.buffer += chunk

    let index = this.buffer.indexOf("\n")
    while (index >= 0) {
      const line = this.buffer.slice(0, index).trim()
      this.buffer = this.buffer.slice(index + 1)

      if (line) {
        try {
          const event = JSON.parse(line) as {
            type?: string
            id?: string
            text?: string
            language?: string
            model?: string
            detail?: string
          }

          if (event.type === "ready") {
            clearTimeout(timer)
            this.status = {
              ready: true,
              model: event.model ?? this.model,
              device: "cuda",
              error: "",
            }
            this.readyResolve?.()
          } else if (event.type === "result" && event.id) {
            const waiter = this.waiters.get(event.id)
            if (waiter) {
              clearTimeout(waiter.timer)
              this.waiters.delete(event.id)
              waiter.resolve({ text: event.text ?? "", language: event.language ?? "" })
            }
          } else if (event.type === "error") {
            const error = new Error(event.detail || "Whisper failed")
            if (event.id) {
              const waiter = this.waiters.get(event.id)
              if (waiter) {
                clearTimeout(waiter.timer)
                this.waiters.delete(event.id)
                waiter.reject(error)
              }
            } else {
              this.status.error = error.message
              this.readyReject?.(error)
            }
          }
        } catch {
          // Ignore non-JSON output such as warnings.
        }
      }

      index = this.buffer.indexOf("\n")
    }
  }

  private failWaiters(error: Error) {
    for (const waiter of this.waiters.values()) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.waiters.clear()
  }

  async transcribe(input: WhisperInput): Promise<WhisperResult> {
    if (!this.child || !this.readyPromise || !this.status.ready) {
      await this.start(input.python || DEFAULT_PYTHON, input.model || "large-v3-turbo")
    }
    await this.readyPromise

    const dir = join(tmpdir(), "opencode-voice-dictation")
    mkdirSync(dir, { recursive: true })
    const extension = input.mime.includes("webm") ? "webm" : "wav"
    const file = join(dir, `whisper-${randomUUID()}.${extension}`)
    writeFileSync(file, Buffer.from(input.audio, "base64"))

    const id = randomUUID()
    const path = toWslPath(file)

    try {
      return await new Promise<WhisperResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.waiters.delete(id)
          reject(new Error("Whisper transcription timed out"))
        }, 120000)

        this.waiters.set(id, { resolve, reject, timer })
        this.child?.stdin?.write(`${JSON.stringify({ id, path, language: input.language })}\n`)
      })
    } finally {
      try {
        rmSync(file, { force: true })
      } catch {
        // Best effort.
      }
    }
  }

  async warm(python: string, model: string): Promise<WhisperStatus> {
    if (!this.status.ready) {
      await this.start(python || DEFAULT_PYTHON, model || "large-v3-turbo")
    }
    return this.statusOf()
  }

  statusOf(): WhisperStatus {
    return { ...this.status }
  }

  stop() {
    this.failWaiters(new Error("Whisper worker stopped"))
    if (this.child) {
      const child = this.child
      this.child = undefined
      this.readyPromise = undefined
      child.kill()
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" })
      }
    }
  }
}
