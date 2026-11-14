import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** A live microphone recording. */
export interface LinuxRecording {
  stop(): Promise<{ audio: string; mime: string }>
  cancel(): void
}

interface Candidate {
  label: string
  command: string
  args: string[]
}

interface StartResult {
  child?: ChildProcess
  error: string
}

const MIN_BYTES = 1024

function workDir(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  return dir
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clampSeconds(value: number): number {
  if (!Number.isFinite(value)) return 60
  return Math.max(5, Math.min(300, Math.round(value)))
}

function candidates(file: string, maxSeconds: number): Candidate[] {
  const ffmpegOutput = ["-t", String(maxSeconds), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", file]

  return [
    {
      label: "ffmpeg PulseAudio",
      command: "ffmpeg",
      args: ["-y", "-hide_banner", "-loglevel", "error", "-f", "pulse", "-i", "default", ...ffmpegOutput],
    },
    {
      label: "ffmpeg ALSA",
      command: "ffmpeg",
      args: ["-y", "-hide_banner", "-loglevel", "error", "-f", "alsa", "-i", "default", ...ffmpegOutput],
    },
    {
      label: "arecord",
      command: "arecord",
      args: ["-q", "-f", "S16_LE", "-r", "16000", "-c", "1", "-t", String(maxSeconds), file],
    },
  ]
}

/**
 * Starts a recorder and waits briefly to see whether the device opens.
 *
 * A missing device usually makes ffmpeg/arecord exit immediately, so a short
 * grace period lets us try the next backend without showing a false "recording"
 * state.
 */
function startCandidate(candidate: Candidate): Promise<StartResult> {
  return new Promise((resolve) => {
    let child: ChildProcess

    try {
      child = spawn(candidate.command, candidate.args, {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      })
    } catch (cause) {
      resolve({ error: `${candidate.label}: ${cause instanceof Error ? cause.message : String(cause)}` })
      return
    }

    let stderr = ""
    let settled = false

    const finish = (result: StartResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      if (!result.child) {
        child.kill("SIGKILL")
      }

      resolve(result)
    }

    const timer = setTimeout(() => finish({ child, error: "" }), 900)

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
    })

    child.once("error", (cause) => {
      finish({ error: `${candidate.label}: ${cause.message}` })
    })

    child.once("close", (code) => {
      if (settled) return
      finish({
        error: `${candidate.label}: ${stderr.trim() || `exited with code ${code ?? "unknown"}`}`,
      })
    })
  })
}

function createRecording(child: ChildProcess, file: string): LinuxRecording {
  let closed = child.exitCode !== null
  let resolveClose: () => void = () => {}
  const closePromise = new Promise<void>((resolve) => {
    resolveClose = resolve
  })

  child.once("close", () => {
    closed = true
    resolveClose()
  })

  if (closed) resolveClose()

  return {
    async stop() {
      if (!closed) child.kill("SIGINT")
      await Promise.race([closePromise, delay(5000)])

      if (!closed) {
        child.kill("SIGKILL")
        await Promise.race([closePromise, delay(1000)])
      }

      if (!existsSync(file) || statSync(file).size < MIN_BYTES) {
        rmSync(file, { force: true })
        throw new Error("No se grabó audio. Revisa el micrófono y el dispositivo de entrada.")
      }

      const audio = readFileSync(file).toString("base64")
      rmSync(file, { force: true })
      return { audio, mime: "audio/wav" }
    },

    cancel() {
      if (!closed) child.kill("SIGKILL")
      rmSync(file, { force: true })
    },
  }
}

/**
 * Records 16 kHz mono WAV on Linux. Tries PulseAudio, ALSA and arecord in that
 * order; the first backend that opens the default input stays alive.
 */
export async function startLinuxRecording(options: { maxSeconds?: number } = {}): Promise<LinuxRecording> {
  const maxSeconds = clampSeconds(options.maxSeconds ?? 60)
  const file = join(workDir(), `tui-${randomUUID()}.wav`)
  let lastError = ""

  for (const candidate of candidates(file, maxSeconds)) {
    const result = await startCandidate(candidate)

    if (result.child) return createRecording(result.child, file)
    lastError = result.error
    rmSync(file, { force: true })
  }

  throw new Error(
    `No se pudo abrir el micrófono. Instala ffmpeg o alsa-utils y revisa el dispositivo de entrada.${
      lastError ? ` (${lastError})` : ""
    }`,
  )
}
