import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { accessSync, chmodSync, constants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
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
  ffmpeg: boolean
  ffmpegVersion: string
  ffmpegPath: string
}

export interface WhisperCppResult {
  text: string
  language: string
}

export interface FfmpegStatus {
  available: boolean
  version: string
  path: string
  error: string
}

export interface InstallFfmpegResult {
  ok: boolean
  error: string
  command: string
}

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
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

/** Runs a command and returns its output instead of throwing on a non-zero exit. */
function runCapture(command: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ""
    let stderr = ""

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => {
      stdout = (stdout + chunk).slice(-8000)
    })
    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-8000)
    })

    child.on("error", (cause) => {
      resolve({ code: null, stdout, stderr: (stderr + errorText(cause)).slice(-8000) })
    })
    child.on("close", (code) => {
      resolve({ code, stdout, stderr: stderr.slice(-8000) })
    })
  })
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function commandExists(command: string): boolean {
  const path = process.env.PATH ?? ""

  return path.split(":").some((directory) => {
    try {
      accessSync(join(directory || ".", command), constants.X_OK)
      return true
    } catch {
      return false
    }
  })
}

/** Checks that ffmpeg can run. ffmpeg converts the browser WebM to 16 kHz WAV. */
export async function detectFfmpeg(): Promise<FfmpegStatus> {
  const result = await runCapture("ffmpeg", ["-version"])

  if (result.code === 0) {
    const version =
      result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith("ffmpeg version")) ?? "ffmpeg"

    return { available: true, version, path: "ffmpeg", error: "" }
  }

  return {
    available: false,
    version: "",
    path: "",
    error: result.stderr.trim() || "ffmpeg not found in PATH",
  }
}

/**
 * Installs ffmpeg with the system package manager.
 *
 * Uses `pkexec` (the desktop's authentication dialog) so the user's password is
 * never handled by the plugin. Falls back to passwordless `sudo -n` and, if
 * neither works, returns the command the user can run manually.
 */
export async function installFfmpeg(): Promise<InstallFfmpegResult> {
  const manual = "sudo apt update && sudo apt install -y ffmpeg"

  if (process.platform !== "linux") {
    return { ok: false, error: "Automatic ffmpeg installation is only available on Linux", command: manual }
  }

  const current = await detectFfmpeg()
  if (current.available) {
    return { ok: true, error: "", command: "" }
  }

  if (!commandExists("apt-get")) {
    const command = commandExists("dnf")
      ? "sudo dnf install -y ffmpeg"
      : commandExists("pacman")
        ? "sudo pacman -S --noconfirm ffmpeg"
        : commandExists("zypper")
          ? "sudo zypper install -y ffmpeg"
          : manual

    return { ok: false, error: "No supported package manager was found", command }
  }

  const install = "DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg"
  const updateAndInstall = `DEBIAN_FRONTEND=noninteractive apt-get update && ${install}`
  const attempts: Array<{ command: string; args: string[] }> = []

  if (commandExists("pkexec")) {
    attempts.push({ command: "pkexec", args: ["sh", "-c", install] })
    attempts.push({ command: "pkexec", args: ["sh", "-c", updateAndInstall] })
  }

  if (commandExists("sudo")) {
    attempts.push({ command: "sudo", args: ["-n", "sh", "-c", install] })
    attempts.push({ command: "sudo", args: ["-n", "sh", "-c", updateAndInstall] })
  }

  let lastError = ""

  for (const attempt of attempts) {
    const result = await runCapture(attempt.command, attempt.args)

    if (result.code === 0) {
      const after = await detectFfmpeg()
      if (after.available) return { ok: true, error: "", command: "" }
      lastError = after.error || "ffmpeg is still not available"
      continue
    }

    lastError = result.stderr.trim() || `${attempt.command} exited with code ${result.code ?? "unknown"}`

    // 126 is "dismissed/not authorized" in pkexec: do not ask for the password
    // again just because the update-and-install fallback exists.
    if (attempt.command === "pkexec" && (result.code === 126 || result.code === 127)) break
  }

  return {
    ok: false,
    error: lastError || "ffmpeg installation failed",
    command: manual,
  }
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
    const ffmpeg = await detectFfmpeg()

    if (!ffmpeg.available) {
      throw new Error(
        `FFMPEG_MISSING: ffmpeg is required to convert the audio. Install it with: sudo apt install -y ffmpeg (${ffmpeg.error})`,
      )
    }

    const port = await this.ensure(input.model, input.language)

    const dir = join(tmpdir(), "opencode-voice-dictation")
    mkdirSync(dir, { recursive: true })

    const extension = input.mime.includes("webm") ? "webm" : "wav"
    const source = join(dir, `whispercpp-${randomUUID()}.${extension}`)
    const wav = `${source}.wav`

    writeFileSync(source, Buffer.from(input.audio, "base64"))

    try {
      try {
        await run("ffmpeg", [
          "-y",
          "-loglevel",
          "error",
          "-i",
          source,
          "-ar",
          "16000",
          "-ac",
          "1",
          "-c:a",
          "pcm_s16le",
          wav,
        ])
      } catch (cause) {
        throw new Error(`ffmpeg failed: ${errorText(cause)}`)
      }

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

  async status(model: string): Promise<WhisperCppStatus> {
    const file = modelFile(model)
    const ffmpeg = await detectFfmpeg()
    const installed = existsSync(binaryPath()) && existsSync(modelPath(file))

    return {
      installed,
      ready: this.state !== undefined && this.state.model === file,
      model: file,
      error: this.error,
      ffmpeg: ffmpeg.available,
      ffmpegVersion: ffmpeg.version,
      ffmpegPath: ffmpeg.path,
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
