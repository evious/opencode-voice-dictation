# TUI: dictado y lectura en la terminal

Guía de la parte TUI del plugin (`./tui`). Funciona en Windows y Linux; en
Windows delega el dictado en Win+H y en Linux usa whisper.cpp.

## Comandos

| Comando | Atajo | Acción |
|---|---|---|
| `/dictado` | `<leader>d` (`Ctrl+X`, luego `d`) | Windows: abre Win+H. Linux: empieza/para la grabación y transcribe. |
| `/leer` | `<leader>v` (`Ctrl+X`, luego `v`) | Lee la última respuesta. Si ya está leyendo, la detiene. |
| `/pausar` | `<leader>p` (`Ctrl+X`, luego `p`) | Pausa o reanuda la lectura (Linux con ffplay/spd-say). |

También aparecen en la paleta (`Ctrl+P`) y en la ayuda de atajos.

## Requisitos

### Windows

- OpenCode TUI en Windows.
- Win+H disponible (Windows 11).
- Para la lectura, Edge (online) o System.Speech (SAPI).

### Linux

- OpenCode TUI y el **servidor de OpenCode en Linux**. El motor whisper.cpp es
  Linux-only; si la TUI se conecta a un servidor Windows, `/dictado` no puede
  usar whisper.cpp.
- `ffmpeg` obligatorio:
  ```bash
  sudo apt install -y ffmpeg
  ```
- Modelo whisper.cpp. La TUI puede descargarlo la primera vez que dictas, o
  desde Ajustes de OpenCode Desktop.
- Inserción del texto:
  - X11 (Xubuntu): `sudo apt install -y xdotool xclip`.
  - Wayland: `wtype` y `wl-clipboard`.
  - WSL: usa el portapapeles de Windows mediante `powershell.exe`.
- Lectura:
  - `ffplay` (viene con `ffmpeg`) o `mpv`.
  - Respaldo sin Edge: `spd-say` (`speech-dispatcher`) o `espeak-ng`.
    ```bash
    sudo apt install -y speech-dispatcher espeak-ng
    ```

## Cómo funciona el dictado en Linux

1. `/dictado` comprueba `whisperCppStatus`: motor, modelo y `ffmpeg`.
   - Si falta algo, ofrece descargarlo/instalarlo con un diálogo.
2. Intenta grabar con `ffmpeg` y PulseAudio, luego ALSA, luego `arecord`.
   - Graba WAV mono a 16 kHz en `/tmp`.
   - `maxSeconds` limita la duración (60 por defecto).
3. La segunda pulsación de `/dictado` detiene la grabación y llama a
   `whisperCppTranscribe`.
4. El texto se inserta en el prompt:
   - Primero intenta `client.tui.appendPrompt` si el runtime lo expone.
   - Si no, en X11 usa `xdotool` (texto ASCII) o portapapeles + `Ctrl+Shift+V`
     (acentos/Unicode).
   - En Wayland usa `wtype`/`wl-copy`.
   - En WSL copia al portapapeles de Windows y prueba `Ctrl+Shift+V` con
     `SendKeys`; si no, deja el texto copiado.

Mantén la terminal enfocada durante la grabación y la inserción.

## Cómo funciona la lectura en Linux

1. Busca el último mensaje assistant con texto.
2. Limpia Markdown con `cleanForSpeech` y lo trocea.
3. Pide el MP3 a Edge (`edgeSpeak`) y lo reproduce con `ffplay`/`mpv`.
4. Si Edge falla, usa `spd-say` o `espeak-ng`.
5. `/leer` mientras habla detiene; `/pausar` pausa/reanuda.

`engine: "system"` evita Edge y usa directamente la voz local.

## Opciones

Se configuran en `opencode.jsonc`:

```jsonc
"plugins": [
  {
    "package": "opencode-voice-dictation",
    "options": {
      "model": "base-q5_1",
      "language": "auto",
      "maxSeconds": 60,
      "insert": "auto",
      "engine": "edge",
      "voice": "es-ES-XimenaNeural",
      "rate": 1,
      "skipCode": true
    }
  }
]
```

| Opción | Por defecto | Qué hace |
|---|---|---|
| `model` | `base-q5_1` | Modelo whisper.cpp (`base-q5_1` o `small-q5_1`). |
| `language` | `auto` | Idioma de transcripción (`auto`, `es`, `en`, `pt`). |
| `maxSeconds` | 60 | Límite de grabación (5–300). |
| `insert` | `auto` | `auto`, `type`, `clipboard` o `append`. |
| `engine` | `edge` | `edge` o `system` para la lectura. |
| `voice` | `es-ES-XimenaNeural` | Voz de Edge. |
| `rate` | 1 | Velocidad de lectura. |
| `skipCode` | true | Omite bloques de código al leer. |

## WSL

Puedes probar la TUI Linux en WSL:

- WSLg da salida y entrada de audio por PulseAudio
  (`PULSE_SERVER=/mnt/wslg/PulseServer`).
- `ffplay` reproduce a través de WSLg.
- La grabación usa `ffmpeg -f pulse -i default`.
- `xdotool` no puede escribir en Windows Terminal; la inserción usa
  `powershell.exe` + portapapeles + `SendKeys`.
- La TUI debe ejecutarse **dentro de WSL**, no desde Windows, para que
  `process.platform === "linux"`.
- El servidor de OpenCode debe correr en WSL/Linux para whisper.cpp.

Comprueba el audio:

```bash
sudo apt install -y pulseaudio-utils
pactl info
pactl list short sources
ffmpeg -f pulse -i default -t 3 -ar 16000 -ac 1 /tmp/test.wav
ffplay /tmp/test.wav
```

Si no hay source, WSLg no está recibiendo el micrófono; usa un WAV existente
para probar la transcripción.

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| «No se pudo abrir el micrófono» | Instala `ffmpeg`/`alsa-utils` y revisa el dispositivo de entrada. En WSL comprueba `pactl`. |
| «No se entendió el audio» | Micrófono silencioso o demasiado corto; acerca el micrófono y repite. |
| No inserta el texto | X11: instala `xdotool` y `xclip`. Wayland: `wtype` y `wl-clipboard`. WSL: revisa el portapapeles de Windows. |
| El texto se copia pero no se pega | Pega con `Ctrl+Shift+V` (o `Ctrl+V` según la terminal). Usa `insert: "clipboard"` para no intentar el pegado automático. |
| `/dictado` dice que el servidor no es Linux | La TUI está conectada a un servidor Windows; whisper.cpp solo está en Linux. |
| «whisper.cpp no está listo» | Descarga el motor/modelo desde la TUI o desde Ajustes de Desktop. |
| Falta ffmpeg | La TUI ofrece instalarlo; manual: `sudo apt install -y ffmpeg`. |
| `/leer` no suena | Comprueba `ffplay`/`mpv` y el dispositivo de salida. En WSL, WSLg. |
| La voz de respaldo falla | Instala `speech-dispatcher` o `espeak-ng`. |
| `/pausar` dice que no se puede | El reproductor no expone pausa (por ejemplo, el player WinRT de Windows). |

## Privacidad

- En Linux el audio se graba en local y se envía al servidor de OpenCode; si el
  servidor es local, no sale del equipo.
- Edge envía el texto a Microsoft para sintetizar la voz. Usa
  `"engine": "system"` para evitarlo.
- El portapapeles se usa para insertar el texto cuando no hay API de prompt;
  puede sustituir el contenido anterior.
