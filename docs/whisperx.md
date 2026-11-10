# Dictado con WhisperX local (Windows + WSL)

Guía para configurar el motor **WhisperX local** del plugin en un equipo con
Windows y WSL2. WhisperX transcribe **audio a texto** (dictado); no es un motor
de lectura.

> Este motor es **avanzado**. Para un usuario sin WSL, Python y GPU NVIDIA, usa
> `Windows Voice Typing (Win+H)` o un motor en la nube. La integración con
> `whisper.cpp` nativo (sin WSL) ya está disponible para Linux; ver
> [la guía de whisper.cpp](whispercpp.md).

## Requisitos

- Windows 10/11 con **WSL2** y una distro **Ubuntu-22.04**.
- **GPU NVIDIA** con un driver de Windows compatible con WSL CUDA.
  - No instales un driver Linux dentro de WSL: usa el driver de Windows.
  - Comprueba con `nvidia-smi` dentro de WSL.
- **Python 3.10** y `python3-venv`.
- **ffmpeg** (WhisperX lo usa para decodificar el audio).
- Un **venv** con `whisperx`, `torch` con CUDA y `pyannote`.
- Modelo `large-v3-turbo` (se descarga la primera vez, ~1,5 GB).
- ~8 GB de VRAM recomendados para `large-v3-turbo` en `float16`.

## 1. Instalar WSL y Ubuntu

En PowerShell como administrador:

```powershell
wsl --install -d Ubuntu-22.04
```

Reinicia si hace falta y comprueba dentro de WSL:

```bash
uname -a
nvidia-smi
```

`nvidia-smi` debe listar tu GPU. Si no aparece, actualiza el driver NVIDIA de
Windows a una versión con soporte WSL/CUDA.

## 2. Crear el entorno de WhisperX

Dentro de WSL:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip ffmpeg

mkdir -p ~/whisperx
cd ~/whisperx
python3 -m venv whisperx-env
source whisperx-env/bin/activate

pip install --upgrade pip
# El índice CUDA debe coincidir con tu driver y la versión de torch.
# cu128 sirve para torch 2.8; usa cu121/cu124 si tu driver es más antiguo.
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install whisperx
```

Verifica:

```bash
python3 - <<'PY'
import torch, whisperx
print("torch", torch.__version__)
print("cuda", torch.cuda.is_available())
print("whisperx", whisperx.__file__)
PY
```

Debe imprimir `cuda True`. Si `torch.cuda.is_available()` es `False`, el
problema es el driver NVIDIA/WSL o la versión de torch, no el plugin.

### Token de Hugging Face (si hace falta)

WhisperX descarga modelos de VAD de `pyannote`. Si pide autenticación:

1. Crea un token en <https://huggingface.co/settings/tokens>.
2. Acepta los términos del modelo de VAD que use tu versión de whisperx.
3. Inicia sesión:

```bash
huggingface-cli login
# o exporta HF_TOKEN=...
```

## 3. Configurar el plugin

En **Ajustes → Dictado por voz**:

| Ajuste | Valor |
|---|---|
| Motor de dictado | `WhisperX local (WSL)` |
| Python del entorno | Ruta del Python del venv, por ejemplo `~/whisperx/whisperx-env/bin/python` |
| Modelo | `large-v3-turbo` |
| Idioma | `Automático` (o `es`, `en`…) |
| Comprobar WhisperX | Arranca el worker y confirma que el modelo carga |

El valor por defecto del plugin apunta a:

```
~/peopleby/voice_to_text/api_voice/demo/whisperx-env/bin/python
```

Cámbialo por tu ruta si instalaste el venv en otro sitio.

Pulsa **Comprobar**. La primera vez tarda 10–30 s porque carga el modelo en la
GPU. Después, cada dictado de una frase corta tarda ~1–2 s.

## 4. Usar el dictado

- Pulsa la píldora del micrófono → `Grabando…`.
- Vuelve a pulsarla → `Transcribiendo…`.
- El texto se inserta en el composer con `composer.insert()`.

La grabación se hace en la ventana (`getUserMedia` + `MediaRecorder`, WebM/Opus)
y se envía por RPC al servidor del plugin.

## Cómo funciona por dentro

```
Ventana (Windows)                    Servidor OpenCode
  getUserMedia + MediaRecorder         RPC whisperTranscribe
  audio WebM base64        ───────►    escribe %TEMP%\opencode-voice-dictation\whisper-*.webm
                                       lanza: wsl.exe -d Ubuntu-22.04 -e bash -lc
                                         '"$HOME/.../python" "/mnt/c/.../src/whisper/worker.py"'
  texto insertado          ◄───────    worker: whisperx large-v3-turbo en CUDA
```

- El worker es `src/whisper/worker.py` y se mantiene vivo: carga el modelo una
  sola vez.
- La ruta del audio en Windows (`C:\Users\...\Temp\...`) se convierte a
  `/mnt/c/Users/...` para que WSL la lea.
- El Python del venv se pasa con `$HOME`, porque una `~` entre comillas no se
  expande en `bash -lc`.
- Si el worker muere, el RPC devuelve el `stderr` real; ya no se queda en
  «Transcribiendo…».

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `No such file or directory` al arrancar | La ruta del Python del venv no existe o no empieza por `$HOME`. Usa la ruta absoluta o `~/...`. |
| `torch.cuda.is_available()` es `False` | Driver NVIDIA de Windows desactualizado o falta soporte WSL. `nvidia-smi` debe funcionar en WSL. |
| Pide token de Hugging Face | Inicia sesión con `huggingface-cli login` y acepta los términos del modelo de VAD. |
| Se queda en `Transcribiendo…` | Mira el toast de error y el log del servidor; el worker devuelve el `stderr`. |
| El RPC devuelve 400 | El plugin server no cargó. Ajustes → Extensiones → Plugins → **Reload**, o reinicia el servicio. |
| La primera transcripción tarda mucho | Es la carga del modelo. Las siguientes son rápidas. |
| `Cannot find package 'msedge-tts'` | Es del motor de lectura Edge, no de Whisper. Edge se carga de forma perezosa y no impide Whisper. |

## Privacidad

El audio se queda en tu equipo: se escribe en `%TEMP%`, se pasa a WSL y se
transcribe en local. WhisperX no envía el audio a ningún servicio. Solo se
descargan los modelos la primera vez.

## Roadmap de motores

La idea es añadir más motores de dictado con la misma interfaz:

| Motor | Estado | Notas |
|---|---|---|
| Windows Voice Typing (Win+H) | Disponible | Cero configuración, online |
| System.Speech | Disponible | Offline, calidad antigua |
| WhisperX local (WSL) | Disponible | Avanzado, NVIDIA + WSL |
| `whisper.cpp` nativo | Disponible | Linux, sin WSL ni Python; ver [la guía](whispercpp.md) |
| Google Cloud Speech-to-Text | Planeado | API key, online |
| OpenAI (`gpt-4o-transcribe` / `whisper-1`) | Planeado | API key, online |
| Deepgram / AssemblyAI | Planeado | API key, online |

Para añadir un motor en la nube, la ventana ya graba el audio y lo envía por
RPC. Solo hace falta:

1. Un método RPC por motor (o un `transcribe({ engine, audio, ... })` genérico).
2. La llamada al proveedor en el servidor.
3. Los ajustes de API key e idioma.
4. Mostrar el texto con `composer.insert()` o, si se quiere dictar hacia otra
   app, copiarlo con `ctx.system.copy()`.

Las claves de API no deben viajar al renderer: se guardan en el store del plugin
o, mejor, en variables de entorno del servidor.
