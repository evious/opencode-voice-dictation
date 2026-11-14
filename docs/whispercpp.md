# Dictado con whisper.cpp nativo (Linux)

Guía para configurar el motor **whisper.cpp** del plugin en Ubuntu y otras
distros Linux. Transcribe **audio a texto** en la CPU, sin WSL, sin Python y sin
GPU.

> Es el motor por defecto en Linux. En Windows no está disponible: usa
> `Windows Voice Typing (Win+H)`, `System.Speech` o
> [WhisperX](whisperx.md).

## Requisitos

- **OpenCode Desktop** en Linux (el plugin GUI no se carga en la consola/TUI).
- **ffmpeg obligatorio**. Sin ffmpeg no se puede convertir la grabación WebM a
  WAV de 16 kHz y la transcripción falla. El plugin lo detecta y ofrece
  **Instalar ffmpeg** en Ajustes; si no puede, muestra el comando. Instalación
  manual:
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ffmpeg -version
  ```
- **glibc** compatible con el binario oficial: Ubuntu 22.04 o posterior. En
  distros muy antiguas habría que compilar `whisper.cpp` a mano.
- **Internet la primera vez**: ~10 MB de binario y 57–180 MB de modelo.
- Micrófono accesible por la app.

No hace falta Python, `cmake` ni GPU.

## ffmpeg (obligatorio)

`whisper-server` solo entiende WAV mono a 16 kHz. La ventana graba WebM/Opus,
así que el plugin usa `ffmpeg` para convertir el audio antes de transcribir.

- **Comprobación**: en Ajustes → Dictado por voz → whisper.cpp verás una fila
  **ffmpeg** con la versión detectada o un aviso de que falta.
- **Instalación desde el plugin**: pulsa **Instalar ffmpeg**. Se usa `pkexec`
  para mostrar el diálogo de contraseña del sistema (no se guarda). Si `pkexec`
  no está disponible, se intenta `sudo -n`; si tampoco, se muestra el comando
  manual.
- **Manual**:
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```
- **Otras distros**: `sudo dnf install -y ffmpeg`, `sudo pacman -S --noconfirm ffmpeg`
  o `sudo zypper install -y ffmpeg`.

## Instalación desde el plugin

1. Instala el plugin (`opencode plugin add opencode-voice-dictation`) y reinicia
   OpenCode Desktop.
2. Abre **Ajustes → Dictado por voz**. En Linux el motor es
   `whisper.cpp (local, nativo)`.
3. Comprueba la fila **ffmpeg**. Si falta, pulsa **Instalar ffmpeg** (o instálalo
   a mano con `sudo apt install -y ffmpeg`).
4. Elige el modelo:
   - `base-q5_1` (57 MB): el más ligero; recomendado para portátiles modestos.
   - `small-q5_1` (~180 MB): más preciso, consume más CPU y memoria.
5. Pulsa **Descargar motor**. Se bajan el binario oficial y el modelo.
6. Pulsa **Comprobar** para verificar que están instalados.
7. Pulsa la píldora del micrófono, habla y vuelve a pulsarla: el texto se
   inserta en el prompt.

La descarga se guarda en:

```
~/.local/share/opencode-voice-dictation/whisper.cpp/
├── whisper-bin-ubuntu-x64/        # o arm64
│   ├── whisper-server
│   └── lib*.so
├── ggml-base-q5_1.bin
└── ggml-small-q5_1.bin            # si lo descargaste
```

## Instalación manual (opcional)

Si prefieres preparar los archivos a mano:

```bash
mkdir -p ~/.local/share/opencode-voice-dictation/whisper.cpp
cd ~/.local/share/opencode-voice-dictation/whisper.cpp

curl -L -o whisper-bin.tar.gz \
  https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-x64.tar.gz
tar xzf whisper-bin.tar.gz
rm whisper-bin.tar.gz

curl -L -O \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin
```

El plugin detecta el binario y el modelo en esa ruta; no necesitas configurar
nada más.

## Cómo funciona

```
Ventana (OpenCode Desktop)
  getUserMedia + MediaRecorder  →  WebM/Opus base64
        │ RPC whisperCppTranscribe
        ▼
Servidor del plugin
  escribe /tmp/opencode-voice-dictation/whispercpp-*.webm
  ffmpeg → WAV 16 kHz mono
  POST http://127.0.0.1:<puerto>/inference
        ▼
whisper-server (proceso persistente)
  modelo cargado una vez; responde {"text": "..."}
```

- `whisper-server` se arranca la primera vez y se mantiene vivo. Cargar el
  modelo es lo lento; las frases siguientes son rápidas.
- Si cambias de modelo o de idioma, el servidor se reinicia para aplicar el
  cambio.
- El puerto se elige al azar entre 18081 y 18580 y solo escucha en
  `127.0.0.1`.
- El audio temporal se borra después de cada transcripción.

## Ajustes

| Ajuste | Por defecto | Qué hace |
|---|---|---|
| Motor de dictado | `whisper.cpp` en Linux | Único motor disponible en Linux. |
| Modelo | `base-q5_1` | `base-q5_1` (57 MB) o `small-q5_1` (~180 MB). |
| Idioma | Automático | Autodetección o `es`, `en`, `pt`. |
| ffmpeg | — | Comprueba si está instalado y ofrece **Instalar ffmpeg**. Es obligatorio. |
| Descargar motor | — | Baja el binario y el modelo seleccionado. |
| Comprobar whisper.cpp | — | Indica si el servidor, el modelo y ffmpeg están listos. |

## Rendimiento orientativo

Depende de la CPU. Como referencia con `base-q5_1` y 4 hilos:

| Equipo | Una frase de 5–10 s |
|---|---|
| Portátil moderno (4–8 núcleos) | ~1–3 s |
| Portátil modesto (2 núcleos) | ~4–10 s |

`small-q5_1` mejora la precisión y multiplica el tiempo por ~2–3. Si el equipo
va justo, quédate en `base-q5_1`.

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| «Whisper.cpp is not installed» | Pulsa **Descargar motor** en Ajustes. |
| La descarga falla | Revisa internet, proxy o firewall hacia GitHub y Hugging Face. |
| `ffmpeg` no encontrado | Pulsa **Instalar ffmpeg** en Ajustes o ejecuta `sudo apt update && sudo apt install -y ffmpeg`. Comprueba con `ffmpeg -version`. |
| «Falta ffmpeg» al dictar | Es obligatorio: sin él no se convierte el WebM a WAV. Instálalo desde Ajustes o con `sudo apt install -y ffmpeg`. |
| El binario no arranca | `glibc` antigua o arquitectura distinta; compila `whisper.cpp` para tu sistema o usa Ubuntu 22.04+. |
| Se queda en «Transcribiendo…» | Mira el toast y el log del servidor de OpenCode; suele ser `ffmpeg` o el binario. |
| El RPC devuelve 400 | El plugin server no cargó: Ajustes → Extensiones → Plugins → **Reload**. |
| Tarda mucho | Usa `base-q5_1`; el primer dictado carga el modelo. |
| No hay píldora | La API GUI solo existe en OpenCode Desktop; en la TUI usa `/dictado` y `/leer`. |

## TUI en Linux

La parte TUI ya soporta Linux:

- `/dictado` graba con `ffmpeg` (PulseAudio/ALSA) o `arecord` y transcribe con
  whisper.cpp.
- Inserta el texto con `appendPrompt` si el runtime lo expone, o con
  `xdotool`/`xclip` en X11, `wtype`/`wl-clipboard` en Wayland, o el
  portapapeles de Windows en WSL.
- `/leer` usa Edge + `ffplay`/`mpv`; si falla, `spd-say` o `espeak-ng`.
- `/pausar` pausa o reanuda la lectura.
- `/ajustes-voz` abre el menú de ajustes de la TUI: modelo, idioma, duración,
  inserción, voz, velocidad y comprobación/instalación de whisper.cpp y ffmpeg.
- Para dictados largos, si la TUI muestra «pegó N líneas», pon
  `"prompt": { "paste": "full" }` en `~/.config/opencode/cli.json` para ver el
  texto completo y corregirlo antes de enviar.

Requisitos:

```bash
sudo apt install -y ffmpeg xdotool xclip
# opcional para la voz de respaldo
sudo apt install -y speech-dispatcher espeak-ng
```

El servidor de OpenCode debe correr en Linux para que whisper.cpp esté
disponible. Guía completa: [`docs/tui.md`](tui.md).

## Privacidad

El audio se escribe en `/tmp`, se convierte en local y se transcribe en la CPU
del servidor. Si el servidor es local, no se envía a ningún servicio. Solo la
primera descarga usa la red (GitHub para el binario y Hugging Face para el
modelo). En la TUI, Edge envía el texto a Microsoft para sintetizar la voz;
usa `"engine": "system"` para la voz local.

## Desktop y TUI

- **OpenCode Desktop**: carga `./gui-experimental`, así que tiene píldora,
  atajo `Ctrl+Shift+M`, `/dictado` y ajustes. whisper.cpp funciona completo.
- **TUI en Windows**: `/dictado` abre Win+H; `/leer` usa Edge y SAPI.
- **TUI en Linux**: `/dictado` graba y transcribe con whisper.cpp; `/leer` usa
  Edge y el reproductor del sistema. Requiere `./tui` (incluido) y un servidor
  Linux.
