import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export interface LinuxPlayback {
  stop(): void
  pause?(): void
  resume?(): void
  done: Promise<boolean>
}

export interface LinuxSpeakHandle {
  stop(): void
  pause?(): void
  resume?(): void
}

interface PlayerCandidate {
  label: string
  command: string
  args: string[]
}

function workDir(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  return dir
}

function createPlayback(child: ChildProcess, file: string): LinuxPlayback {
  let stopped = false
  let resolveDone: (ok: boolean) => void = () => {}
  const done = new Promise<boolean>((resolve) => {
    resolveDone = resolve
  })

  const finish = (ok: boolean) => {
    rmSync(file, { force: true })
    resolveDone(ok)
  }

  child.once("close", (code) => {
    finish(!stopped && code === 0)
  })

  if (child.exitCode !== null) {
    finish(!stopped && child.exitCode === 0)
  }

  return {
    done,
    stop() {
      if (child.exitCode !== null) return
      stopped = true
      child.kill("SIGKILL")
      finish(false)
    },
    pause() {
      if (child.exitCode === null) child.kill("SIGSTOP")
    },
    resume() {
      if (child.exitCode === null) child.kill("SIGCONT")
    },
  }
}

function startPlayer(candidate: PlayerCandidate, file: string): Promise<LinuxPlayback | undefined> {
  return new Promise((resolve) => {
    let child: ChildProcess

    try {
      child = spawn(candidate.command, candidate.args, {
        stdio: ["ignore", "ignore", "ignore"],
        windowsHide: true,
      })
    } catch {
      resolve(undefined)
      return
    }

    let settled = false

    child.once("spawn", () => {
      if (settled) return
      settled = true
      resolve(createPlayback(child, file))
    })

    child.once("error", () => {
      if (settled) return
      settled = true
      resolve(undefined)
    })
  })
}

/**
 * Plays an Edge MP3 with the first available Linux player.
 *
 * ffplay ships with ffmpeg (already required by whisper.cpp); mpv and cvlc are
 * optional fallbacks. SIGSTOP/SIGCONT give pause/resume without extra IPC.
 */
export async function playMp3Base64(base64: string): Promise<LinuxPlayback> {
  if (process.platform !== "linux") {
    return { stop() {}, done: Promise.resolve(false) }
  }

  const file = join(workDir(), `speech-${randomUUID()}.mp3`)
  writeFileSync(file, Buffer.from(base64, "base64"))

  const candidates: PlayerCandidate[] = [
    {
      label: "ffplay",
      command: "ffplay",
      args: ["-nodisp", "-autoexit", "-loglevel", "quiet", file],
    },
    {
      label: "mpv",
      command: "mpv",
      args: ["--no-video", "--really-quiet", "--no-terminal", file],
    },
    {
      label: "cvlc",
      command: "cvlc",
      args: ["--play-and-exit", "--intf", "dummy", file],
    },
  ]

  for (const candidate of candidates) {
    const playback = await startPlayer(candidate, file)
    if (playback) return playback
  }

  rmSync(file, { force: true })
  return { stop() {}, done: Promise.resolve(false) }
}

type SpdResult = "started" | "failed" | "done"

interface SpdStart {
  result: SpdResult
  child?: ChildProcess
}

function startSpdSay(text: string, rate: number, finish: (ok: boolean) => void): Promise<SpdStart> {
  return new Promise((resolve) => {
    const spdRate = Math.max(-100, Math.min(100, Math.round((rate - 1) * 100)))
    let child: ChildProcess

    try {
      child = spawn("spd-say", ["--wait", "--rate", String(spdRate), "--", text], {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      })
    } catch {
      resolve({ result: "failed" })
      return
    }

    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ result: "started", child })
    }, 300)

    child.once("error", () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ result: "failed" })
    })

    child.once("close", (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        if (code === 0) {
          finish(true)
          resolve({ result: "done", child })
          return
        }
        resolve({ result: "failed" })
        return
      }

      finish(code === 0)
    })
  })
}

function startEspeak(
  text: string,
  rate: number,
  finish: (ok: boolean) => void,
): ChildProcess | undefined {
  const wpm = Math.max(80, Math.min(450, Math.round(175 * rate)))
  let child: ChildProcess

  try {
    child = spawn("espeak-ng", ["--stdin", "-s", String(wpm)], {
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true,
    })
  } catch {
    return undefined
  }

  child.once("error", () => finish(false))
  child.once("close", (code) => finish(code === 0))
  child.stdin?.end(text)
  return child
}

/**
 * Spoken fallback when Edge is unavailable. Uses speech-dispatcher (spd-say)
 * first, then espeak-ng. spd-say has native pause/resume; espeak-ng uses
 * SIGSTOP/SIGCONT.
 */
export function speakLinux(text: string, rate: number, onDone: (ok: boolean) => void): LinuxSpeakHandle {
  if (process.platform !== "linux") {
    setImmediate(() => onDone(false))
    return { stop() {} }
  }

  let settled = false
  let child: ChildProcess | undefined
  let backend: "spd-say" | "espeak-ng" | undefined

  const finish = (ok: boolean) => {
    if (settled) return
    settled = true
    onDone(ok)
  }

  void (async () => {
    const spd = await startSpdSay(text, rate, finish)
    if (spd.result === "done" || spd.result === "started") {
      if (settled) {
        spd.child?.kill("SIGKILL")
        return
      }
      backend = "spd-say"
      child = spd.child
      return
    }

    const espeak = startEspeak(text, rate, finish)
    if (espeak) {
      if (settled) {
        espeak.kill("SIGKILL")
        return
      }
      backend = "espeak-ng"
      child = espeak
      return
    }

    finish(false)
  })()

  return {
    stop() {
      if (settled) return
      if (backend === "spd-say") {
        child?.kill("SIGKILL")
        spawn("spd-say", ["-S"], { windowsHide: true, stdio: "ignore" })
      } else {
        child?.kill("SIGKILL")
      }
      finish(false)
    },

    pause() {
      if (settled) return
      if (backend === "spd-say") {
        spawn("spd-say", ["-P"], { windowsHide: true, stdio: "ignore" })
      } else {
        child?.kill("SIGSTOP")
      }
    },

    resume() {
      if (settled) return
      if (backend === "spd-say") {
        spawn("spd-say", ["-R"], { windowsHide: true, stdio: "ignore" })
      } else {
        child?.kill("SIGCONT")
      }
    },
  }
}
