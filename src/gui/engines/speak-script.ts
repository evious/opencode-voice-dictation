/**
 * Text-to-speech fallback with `System.Speech.Synthesis`, written to a
 * temporary `.ps1` file at runtime.
 *
 * It reads the text from a UTF-8 file instead of the command line, so long
 * messages and any character (accents, quotes, newlines) travel intact.
 *
 * `-ListVoices` prints one installed voice name per line.
 *
 * Keep the file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script as
 * ANSI.
 */
export const SPEAK_SCRIPT = String.raw`param(
  [string]$TextFile = "",
  [int]$Rate = 0,
  [string]$Voice = "",
  [switch]$ListVoices
)

$ErrorActionPreference = "Stop"

try {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = $utf8
} catch { }

try {
  Add-Type -AssemblyName System.Speech
} catch {
  exit 2
}

try {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
} catch {
  exit 3
}

if ($ListVoices) {
  try {
    foreach ($entry in $synth.GetInstalledVoices()) {
      if ($entry.Enabled) {
        [Console]::Out.WriteLine($entry.VoiceInfo.Name)
      }
    }
  } catch { }
  $synth.Dispose()
  exit 0
}

if ($Rate -lt -10) { $Rate = -10 }
if ($Rate -gt 10) { $Rate = 10 }

try { $synth.Rate = $Rate } catch { }

if ($Voice -ne "") {
  try { $synth.SelectVoice($Voice) } catch { }
}

try {
  $text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
  $synth.Speak($text)
} catch { }

$synth.Dispose()
`
