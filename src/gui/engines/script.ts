/**
 * The Windows speech engine, written to a temporary `.ps1` file at runtime.
 *
 * It is embedded instead of shipped as a resource so the single-file GUI
 * bundle never has to resolve a path to it.
 *
 * Protocol: one JSON object per line on stdout, flushed after every event.
 *
 *   {"type":"ready","locale":"es-ES","requested":"es-ES"}
 *   {"type":"final","text":"hola","confidence":0.82,"locale":"es-ES"}
 *   {"type":"error","code":"...","detail":"...","available":["en-US"]}
 *   {"type":"diagnose","locales":[...],"microphone":true,"selected":"es-ES","error":""}
 *
 * Keep the file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script as
 * ANSI. Write `$` and avoid `${...}` and backticks so it survives the template
 * literal.
 */
export const DICTATION_SCRIPT = String.raw`param(
  [string]$Culture = "es-ES",
  [double]$MinConfidence = 0.4,
  [switch]$Diagnose
)

$ErrorActionPreference = "Stop"

try {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = $utf8
} catch { }

function Emit {
  param([hashtable]$Payload)
  [Console]::Out.WriteLine(($Payload | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}

try {
  Add-Type -AssemblyName System.Speech
} catch {
  Emit @{ type = "error"; code = "SYSTEM_SPEECH_UNAVAILABLE"; detail = "$($_.Exception.Message)"; available = @() }
  exit 2
}

$installed = @()
try {
  foreach ($entry in [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()) {
    $installed += $entry.Culture.Name
  }
} catch { }

$selected = ""
foreach ($name in $installed) {
  if ($name -eq $Culture) { $selected = $name; break }
}
if ($selected -eq "") {
  $base = ($Culture -split "-")[0]
  foreach ($name in $installed) {
    if (($name -split "-")[0] -eq $base) { $selected = $name; break }
  }
}

if ($Diagnose) {
  $microphone = $false
  $problem = ""
  if ($installed.Count -gt 0) {
    try {
      $probeCulture = New-Object System.Globalization.CultureInfo($installed[0])
      $probe = New-Object System.Speech.Recognition.SpeechRecognitionEngine($probeCulture)
      $probe.SetInputToDefaultAudioDevice()
      $microphone = $true
      $probe.Dispose()
    } catch {
      $problem = "$($_.Exception.Message)"
    }
  } else {
    $problem = "NO_RECOGNIZERS"
  }
  Emit @{ type = "diagnose"; locales = @($installed); microphone = $microphone; selected = $selected; error = $problem }
  exit 0
}

if ($installed.Count -eq 0) {
  Emit @{ type = "error"; code = "NO_RECOGNIZERS"; detail = ""; available = @() }
  exit 3
}

if ($selected -eq "") {
  Emit @{ type = "error"; code = "LANGUAGE_NOT_AVAILABLE"; detail = $Culture; available = @($installed) }
  exit 4
}

try {
  $cultureInfo = New-Object System.Globalization.CultureInfo($selected)
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($cultureInfo)
  $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $recognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(10)
  $recognizer.BabbleTimeout = [TimeSpan]::FromSeconds(5)
  $recognizer.EndSilenceTimeout = [TimeSpan]::FromSeconds(0.6)
  $recognizer.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(1.2)
  $recognizer.SetInputToDefaultAudioDevice()
} catch {
  Emit @{ type = "error"; code = "MICROPHONE_UNAVAILABLE"; detail = "$($_.Exception.Message)"; available = @($installed) }
  exit 5
}

Emit @{ type = "ready"; locale = $selected; requested = $Culture }

$failures = 0
while ($true) {
  try {
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds(5))
    $failures = 0
    if ($result -ne $null -and $result.Text -ne "" -and $result.Confidence -ge $MinConfidence) {
      Emit @{ type = "final"; text = $result.Text; confidence = [math]::Round($result.Confidence, 3); locale = $selected }
    }
  } catch {
    $failures++
    if ($failures -ge 5) {
      Emit @{ type = "error"; code = "RECOGNITION_FAILED"; detail = "$($_.Exception.Message)"; available = @() }
      exit 6
    }
    Start-Sleep -Milliseconds 250
  }
}
`
