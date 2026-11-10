import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { connect } from "node:net"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"

const RELEASE = "v1.9.2"
const X64_TARBALL = `https://github.com/ggml-org/whisper.cpp/releases/download/${RELEASE}/whisper-bin-ubuntu-x64.tar.gz`
const ARM64_TARBALL = `https://github.com/ggml-org/whisper.cpp/releases/download/${RELEASE}/whisper-bin-ubuntu-arm64.tar.gz`
const MODEL_BASE = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main"

const MODELS = {
  "base-q5_1": "ggml-base-q5_1.bin",
  "small-q5_1": "ggml-small-q5_1.bin",
} as const

type ModelKey = keyof typeof MODELS

export interface WhisperCppStatus {
  installed: boolean
  ready: boolean
  model: string
  error: string
}

export interface WhisperCppResult {
  text: string
  language: string
}

function rootDir(): string {
  return join(homedir(), ".local", "share", "opencode-voice-dictation", "whisper.cpp")
}

function packageDir(): string {
  return join(rootDir(), process.arch === "arm64" ? "whisper-bin-ubuntu-arm64" : "whisper-bin-ubuntu-x64")
}

function binaryPath(): string {
  return join(packageDir(), "whisper-server")
}

function modelFile(model: string): ModelKey {
  return model in MODELS ? (model as ModelKey) : "base-q5_1"
}

function modelPath(model: string): string {
  return join(rootDir(), MODELS[modelFile(model)])
}

async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }

  mkdirSync(rootDir(), { recursive: true })
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()))
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stderr = ""

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
    })

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve(stderr)
      else reject(new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}`))
    })
  })
}

export async function installWhisperCpp(model: string): Promise<{ ok: boolean; model: string; error: string }> {
  if (process.platform !== "linux") {
    return { ok: false, model: modelFile(model), error: "Whisper.cpp native is only implemented for Linux" }
  }

  try {
    mkdirSync(rootDir(), { recursive: true })

    if (!existsSync(binaryPath())) {
      const tarball = join(rootDir(), "whisper-bin.tar.gz")
      await download(process.arch === "arm64" ? ARM64_TARBALL : X64_TARBALL, tarball)
      await run("tar", ["-xzf", tarball, "-C", rootDir()])
      rmSync(tarball, { force: true })
      chmodSync(binaryPath(), 0o755)
    }

    const file = modelFile(model)
    if (!existsSync(modelPath(file))) {
      await download(`${MODEL_BASE}/${MODELS[file]}`, modelPath(file))
    }

    return { ok: true, model: file, error: "" }
  } catch (cause) {
    return { ok: false, model: modelFile(model), error: cause instanceof Error ? cause.message : String(cause) }
  }
}

interface StartState {
  child: ChildProcess
  port: number
  model: string
  language: string
  stderr: string
}

export class WhisperCppEngine {
  private state: StartState | undefined
  private starting: Promise<number> | undefined
  private error = ""

  private waitForPort(port: number, timeout: number): Promise<number> {
    const started = Date.now()

    return new Promise((resolve, reject) => {
      const attempt = () => {
        const socket = connect(port, "127.0.0.1")

        socket.once("connect", () => {
          socket.destroy()
          resolve(port)
        })

        socket.once("error", () => {
          socket.destroy()
          if (Date.now() - started > timeout) {
            reject(new Error("whisper-server did not start in time"))
            return
          }
          setTimeout(attempt, 250)
        })
      }

      attempt()
    })
  }

  private async ensure(model: string, language: string): Promise<number> {
    const file = modelFile(model)
    const lang = language || "auto"

    if (this.state && this.state.model === file && this.state.language === lang) {
      return this.state.port
    }

    if (this.starting) return this.starting

    this.stop()
    this.error = ""

    for (const path of [binaryPath(), modelPath(file)]) {
      if (!existsSync(path)) {
        throw new Error("Whisper.cpp is not installed. Open Settings and download it first.")
      }
    }

    const port = 18081 + Math.floor(Math.random() * 500)
    const child = spawn(
      binaryPath(),
      ["-m", modelPath(file), "-l", lang, "-t", "4", "--host", "127.0.0.1", "--port", String(port)],
      {
        cwd: packageDir(),
        env: {
          ...process.env,
          LD_LIBRARY_PATH: [packageDir(), process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
        },
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
      },
    )

    const state: StartState = { child, port, model: file, language: lang, stderr: "" }
    this.state = state

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      state.stderr = (state.stderr + chunk).slice(-2000)
    })

    const exited = new Promise<never>((_, reject) => {
      child.once("error", (cause) => reject(cause))
      child.once("close", (code) => {
        if (this.state === state) this.state = undefined
        reject(new Error(state.stderr.trim() || `whisper-server exited with code ${code ?? "unknown"}`))
      })
    })
    exited.catch(() => {})

    this.starting = Promise.race([this.waitForPort(port, 120000), exited])
      .then((value) => {
        this.starting = undefined
        return value
      })
      .catch((cause) => {
        this.starting = undefined
        this.error = cause instanceof Error ? cause.message : String(cause)
        this.stop()
        throw cause
      })

    return this.starting
  }

  async transcribe(input: {
    audio: string
    mime: string
    language: string
    model: string
  }): Promise<WhisperCppResult> {
    const port = await this.ensure(input.model, input.language)

    const dir = join(tmpdir(), "opencode-voice-dictation")
    mkdirSync(dir, { recursive: true })

    const extension = input.mime.includes("webm") ? "webm" : "wav"
    const source = join(dir, `whispercpp-${randomUUID()}.${extension}`)
    const wav = `${source}.wav`

    writeFileSync(source, Buffer.from(input.audio, "base64"))

    try {
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav])

      const form = new FormData()
      form.append("file", new Blob([new Uint8Array(readFileSync(wav))], { type: "audio/wav" }), "audio.wav")

      const response = await fetch(`http://127.0.0.1:${port}/inference`, { method: "POST", body: form })

      if (!response.ok) {
        throw new Error(`whisper-server HTTP ${response.status}`)
      }

      const data = (await response.json()) as { text?: string }

      return {
        text: (data.text ?? "").trim(),
        language: input.language || "",
      }
    } finally {
      rmSync(source, { force: true })
      rmSync(wav, { force: true })
    }
  }

  status(model: string): WhisperCppStatus {
    const file = modelFile(model)
    const installed = existsSync(binaryPath()) && existsSync(modelPath(file))

    return {
      installed,
      ready: this.state !== undefined && this.state.model === file,
      model: file,
      error: this.error,
    }
  }

  stop() {
    if (this.state) {
      const child = this.state.child
      this.state = undefined
      child.kill()
      if (child.pid) {
        spawn("pkill", ["-P", String(child.pid)], { windowsHide: true, stdio: "ignore" })
      }
    }
    this.starting = undefined
  }
}
