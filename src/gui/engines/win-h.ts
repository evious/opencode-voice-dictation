import { spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Sends the Windows voice typing shortcut (Win+H).
 *
 * `SendKeys` cannot press the Windows key, so this uses `keybd_event` from
 * user32.dll through an inline C# type compiled by `Add-Type`.
 *
 * Keep the script ASCII-only: Windows PowerShell 5.1 reads a BOM-less script
 * as ANSI.
 */
export const WIN_H_SCRIPT = String.raw`$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class WinH {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

  private const byte VK_LWIN = 0x5B;
  private const byte VK_H = 0x48;
  private const uint KEYUP = 0x0002;

  public static void Send() {
    keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_H, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_H, 0, KEYUP, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_LWIN, 0, KEYUP, UIntPtr.Zero);
  }
}
"@

[WinH]::Send()
`

const POWERSHELL = "powershell.exe"

function scriptFile(): string {
  const dir = join(tmpdir(), "opencode-voice-dictation")
  mkdirSync(dir, { recursive: true })
  const hash = createHash("sha1").update(WIN_H_SCRIPT).digest("hex").slice(0, 12)
  const file = join(dir, `win-h-${hash}.ps1`)
  writeFileSync(file, WIN_H_SCRIPT, "utf8")
  return file
}

function spawnPowershell(args: string[]): ChildProcess {
  return spawn(POWERSHELL, args, {
    windowsHide: true,
    stdio: "ignore",
  })
}

export function sendVoiceTypingShortcut(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnPowershell([
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptFile(),
    ])

    child.on("error", (cause) => reject(cause))
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Win+H helper exited with code ${code ?? "unknown"}`))
    })
  })
}
