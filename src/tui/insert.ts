import { spawn, type ChildProcess } from "node:child_process"
import { accessSync, constants, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "@opencode/plugin/tui"

export interface InsertOptions {
  /** auto (default), type, clipboard or append. */
  mode?: string
}

export interface InsertResult {
  ok: boolean
  method: "append" | "type" | "clipboard" | "none"
  message: string
}

interface RunResult {
  code: number | null
  stderr: string
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

function isWsl(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true

  try {
    return readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft")
  } catch {
    return false
  }
}

function isWayland(): boolean {
  return Boolean(process.env.WAYLAND_DISPLAY) || process.env.XDG_SESSION_TYPE === "wayland"
}

function isX11(): boolean {
  return Boolean(process.env.DISPLAY) && !isWayland()
}

function run(command: string, args: string[], input?: string): Promise<RunResult> {
  return new Promise((resolve) => {
    let child: ChildProcess

    try {
      child = spawn(command, args, {
        stdio: ["pipe", "ignore", "pipe"],
        windowsHide: true,
      })
    } catch (cause) {
      resolve({ code: null, stderr: cause instanceof Error ? cause.message : String(cause) })
      return
    }

    let stderr = ""
    let settled = false

    const finish = (code: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ code, stderr: stderr.slice(-2000) })
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      finish(null)
    }, 20000)

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
    })

    child.once("error", (cause) => {
      stderr = (stderr + (cause instanceof Error ? cause.message : String(cause))).slice(-2000)
      finish(null)
    })
    child.once("close", (code) => finish(code))

    if (input !== undefined) child.stdin?.end(input)
    else child.stdin?.end()
  })
}

function powershell(): string | undefined {
  const candidates = [
    process.env.POWERSHELL,
    "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
    "powershell.exe",
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate.includes("/") ? existsSync(candidate) : commandExists(candidate)) return candidate
  }

  return undefined
}

async function copyX11(text: string): Promise<boolean> {
  if (commandExists("xclip")) {
    const result = await run("xclip", ["-selection", "clipboard"], text)
    if (result.code === 0) return true
  }

  if (commandExists("xsel")) {
    const result = await run("xsel", ["--clipboard", "--input"], text)
    if (result.code === 0) return true
  }

  return false
}

async function typeX11(text: string): Promise<boolean> {
  if (!commandExists("xdotool")) return false
  const result = await run("xdotool", ["type", "--clearmodifiers", "--delay", "0", "--", text])
  return result.code === 0
}

async function pasteX11(): Promise<boolean> {
  if (!commandExists("xdotool")) return false
  const result = await run("xdotool", ["key", "--clearmodifiers", "ctrl+shift+v"])
  return result.code === 0
}

async function copyWayland(text: string): Promise<boolean> {
  if (!commandExists("wl-copy")) return false
  const result = await run("wl-copy", [], text)
  return result.code === 0
}

async function typeWayland(text: string): Promise<boolean> {
  if (!commandExists("wtype")) return false
  const result = await run("wtype", ["--", text])
  return result.code === 0
}

async function pasteWayland(): Promise<boolean> {
  if (!commandExists("wtype")) return false
  const result = await run("wtype", ["-M", "ctrl", "-M", "shift", "-k", "v", "-m", "shift", "-m", "ctrl"])
  return result.code === 0
}

export function wslClipboardCommand(text: string): string {
  const encoded = Buffer.from(text, "utf8").toString("base64")
  return `Set-Clipboard -Value ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')))`
}

async function copyWsl(ps: string, text: string): Promise<boolean> {
  const result = await run(ps, ["-NoProfile", "-NonInteractive", "-Command", wslClipboardCommand(text)])
  return result.code === 0
}

async function pasteWsl(ps: string): Promise<boolean> {
  const result = await run(ps, [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^+v')",
  ])

  return result.code === 0
}

function ascii(text: string): boolean {
  return /^[\x00-\x7F]*$/.test(text)
}

function none(message: string): InsertResult {
  return { ok: false, method: "none", message }
}

/**
 * Inserts dictated text into the TUI prompt.
 *
 * V2 does not expose a documented prompt-append API, so it first tries the V1
 * compatible `client.tui.appendPrompt` when present. On Linux it falls back to
 * typing/pasting into the focused terminal: xdotool/X11, wtype/Wayland, or the
 * Windows clipboard when running inside WSL.
 */
export async function insertIntoPrompt(
  context: Plugin.Context,
  text: string,
  options: InsertOptions = {},
): Promise<InsertResult> {
  const mode = options.mode ?? "auto"
  const client = context.client as unknown as {
    tui?: {
      appendPrompt?: (input: { body: { text: string } }) => Promise<unknown>
    }
  }

  if ((mode === "auto" || mode === "append") && client.tui?.appendPrompt) {
    try {
      const result = await client.tui.appendPrompt({ body: { text } })
      if (result !== false) return { ok: true, method: "append", message: "" }
    } catch {
      // Fall through to the platform-specific path.
    }
  }

  if (mode === "append") return none("El prompt de la TUI no admite insertar texto directamente.")

  if (process.platform !== "linux") {
    return none("La inserción automática solo está implementada en Linux y WSL.")
  }

  if (isWsl()) {
    const ps = powershell()
    if (!ps) return none("No encontré powershell.exe para copiar al portapapeles de Windows.")

    if (!(await copyWsl(ps, text))) {
      return none("No pude copiar el texto al portapapeles de Windows.")
    }

    if (mode === "clipboard") {
      return { ok: true, method: "clipboard", message: "Texto copiado. Pégalo con Ctrl+Shift+V." }
    }

    if (await pasteWsl(ps)) {
      return {
        ok: true,
        method: "clipboard",
        message: "Si no aparece en el prompt, pégalo con Ctrl+Shift+V.",
      }
    }
    return { ok: true, method: "clipboard", message: "Texto copiado. Pégalo con Ctrl+Shift+V." }
  }

  if (isWayland()) {
    if (mode === "type") {
      if (await typeWayland(text)) return { ok: true, method: "type", message: "" }
      return none("Instala wtype para insertar texto en Wayland.")
    }

    if (await copyWayland(text)) {
      if (mode !== "clipboard" && (await pasteWayland())) {
        return { ok: true, method: "clipboard", message: "" }
      }
      return { ok: true, method: "clipboard", message: "Texto copiado. Pégalo con Ctrl+Shift+V." }
    }

    if (mode === "auto" && (await typeWayland(text))) return { ok: true, method: "type", message: "" }
    return none("Instala wl-clipboard o wtype para insertar texto en Wayland.")
  }

  if (isX11()) {
    if (mode === "type") {
      if (await typeX11(text)) return { ok: true, method: "type", message: "" }
      return none("Instala xdotool para insertar texto automáticamente en X11.")
    }

    const hasClipboard = commandExists("xclip") || commandExists("xsel")
    const hasXdotool = commandExists("xdotool")

    if (mode === "auto" && ascii(text) && hasXdotool && (await typeX11(text))) {
      return { ok: true, method: "type", message: "" }
    }

    if (hasClipboard && (await copyX11(text))) {
      if (mode !== "clipboard" && hasXdotool && (await pasteX11())) {
        return { ok: true, method: "clipboard", message: "" }
      }
      return { ok: true, method: "clipboard", message: "Texto copiado. Pégalo con Ctrl+Shift+V." }
    }

    if (mode === "auto" && hasXdotool && (await typeX11(text))) {
      return { ok: true, method: "type", message: "" }
    }

    return none("Instala xdotool, xclip o xsel para insertar texto en X11.")
  }

  return none("No hay un entorno gráfico (DISPLAY/WAYLAND_DISPLAY) para insertar el texto.")
}
