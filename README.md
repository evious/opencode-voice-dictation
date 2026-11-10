# Dictado por voz para OpenCode Desktop

Plugin de [OpenCode](https://opencode.ai) V2 que añade voz a la app de
escritorio:

- **Dictado**: pulsas la píldora y se abre el dictado de Windows 11 (Win+H),
  que escribe en el prompt con su motor neuronal. También puedes usar el motor
  offline `System.Speech` desde Ajustes.
- **Lectura**: pulsa «Leer» y reproduce en voz alta la última respuesta.

- **Dictado preciso**: por defecto delega en Windows Voice Typing (Win+H).
- **Modo offline**: `System.Speech` sigue disponible como alternativa sin
  conexión y sin depender del dictado de Windows.
- **Sin portapapeles**: la lectura usa `composer.insert()` en la posición del
  cursor, sin robar el foco ni simular `Ctrl+V`.
- **Lectura natural**: voces neuronales de Edge (45 en español), con respaldo
  a las voces del sistema si no hay internet.
- **WhisperX local (avanzado)**: dictado con WhisperX en WSL y GPU NVIDIA. Ver
  [la guía](https://github.com/evious/opencode-voice-dictation/blob/main/docs/whisperx.md).
- **Solo Windows**: la app declara `os: ["windows"]`; en otros sistemas aparece
  como no disponible en vez de fallar.

## Instalación rápida

```bash
opencode plugin add opencode-voice-dictation
```

Reinicia OpenCode Desktop. El plugin queda registrado en el `opencode.json`
global del entorno donde ejecutes el comando.

Actualizar:

```bash
opencode plugin update opencode-voice-dictation
```

También puedes instalarlo directamente desde el repositorio (el bundle `dist/`
está commiteado):

```bash
opencode plugin add github:evious/opencode-voice-dictation
```

## Compatibilidad

Probado con OpenCode Desktop **2.2.6** en Windows 11. La API de plugins GUI es
experimental (`gui-experimental`) y puede cambiar entre versiones de OpenCode.

## Cómo funciona

```
┌─ Ventana (Solid) ─────────────────────────────┐
│ ComposerPill 🎤  →  ctx.main(Dictation).start │
│         ↑                                     │
│    evento "final"  →  composer.insert(texto)  │
└───────────────┬───────────────────────────────┘
                │ Ipc (proceso main de Electron)
┌───────────────▼───────────────────────────────┐
│ powershell.exe -File dictation-<hash>.ps1     │
│   System.Speech + DictationGrammar            │
│   una línea JSON por frase reconocida         │
└───────────────────────────────────────────────┘
```

El motor vive en el proceso `main` de Electron porque necesita
`node:child_process`. La ventana solo pinta el estado y escribe el texto.

Con el motor por defecto (`Windows Voice Typing`) el flujo es más corto: la
píldora enfoca el composer, el proceso `main` envía `Win+H` con `keybd_event`, y
Windows escribe directamente en el campo. El plugin no transcribe ni toca el
texto.

## Requisitos

- OpenCode Desktop en **Windows 10/11**.
- Node.js 22 o superior para compilar (solo en desarrollo).
- Un **paquete de idioma de reconocimiento de voz** instalado:
  Configuración → Hora e idioma → Idioma y región → (idioma) → Opciones →
  Reconocimiento de voz. No basta con el paquete de visualización.
- Micrófono predeterminado configurado.

Comprobación rápida en PowerShell:

```powershell
Add-Type -AssemblyName System.Speech
[System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() |
  ForEach-Object { $_.Culture.Name }
```

## Compilar

```bash
npm install
npm run build
```

Genera `dist/gui-experimental.cjs`. Para desarrollo, `npm run dev` reconstruye
en cada cambio y OpenCode Desktop recarga el plugin solo.

## Instalación manual (desarrollo)

1. Copia al lado de Windows una carpeta con:

   ```
   voice-dictation/
   ├── package.json
   ├── dist/gui-experimental.cjs
   └── src/index.ts
   ```

   `node_modules` no hace falta: la parte servidor solo importa tipos y el
   bundle usa los módulos que la app ya proporciona.

2. Añade la carpeta al `opencode.json` **global** de la app de escritorio
   (`C:\Users\<usuario>\.config\opencode\opencode.json`):

   ```jsonc
   {
     "plugins": ["C:\\Users\\<usuario>\\opencode-plugins\\voice-dictation"]
   }
   ```

   La app de escritorio solo lee plugins GUI del `opencode.json` global, no de
   `cli.json`.

3. Abre **Ajustes → Extensiones → Plugins** y comprueba que aparece
   `voice-dictation`. Si no aparece, revisa la ruta y los logs de la app.

> Si compilas en WSL, copia la carpeta a una ruta de Windows. La app no puede
> cargar el bundle desde una ruta de Linux.

## Uso

| Acción | Cómo |
|---|---|
| Empezar / parar dictado | Clic en la píldora 🎤 sobre el composer |
| Atajo de dictado | `Ctrl+Shift+M` (configurable en Ajustes → Atajos) |
| Comando de dictado | `/dictado` en el prompt |
| Leer el último mensaje | Clic en la píldora «Leer», o `Ctrl+Shift+L` |
| Comando de lectura | `/leer` en el prompt |
| Ajustes | Ajustes → Dictado por voz, o paleta: "Ajustes de dictado por voz" |

La píldora del micrófono muestra el estado: `Dictar`, `Iniciando…`,
`Escuchando…` (System.Speech), `Dictando…` (Win+H) y `Reintentar dictado` si
algo falla.

La píldora «Leer» cambia a `Leyendo…`. Mientras lee, al pulsarla se abre un
menú con **Pausar / Reanudar**, **Leer de nuevo** y **Detener**. La pausa
continúa exactamente donde se quedó. Dictar detiene la lectura y leer detiene el
dictado, para que el micrófono no capture la voz del altavoz.

El texto se inserta en la posición del cursor. Si ya hay texto y no termina en
espacio, se añade uno de separación (configurable).

## Motores de dictado

| Motor | Requisitos | Estado |
|---|---|---|
| Windows Voice Typing (Win+H) | Windows 11, internet | Por defecto |
| System.Speech | Windows, offline | Disponible |
| WhisperX local (WSL) | WSL2 + Python + CUDA + NVIDIA | Avanzado · [guía](https://github.com/evious/opencode-voice-dictation/blob/main/docs/whisperx.md) |
| `whisper.cpp` nativo | Binario + modelo | Roadmap |
| Google Cloud Speech-to-Text | API key, internet | Roadmap |
| OpenAI (`gpt-4o-transcribe`) | API key, internet | Roadmap |
| Deepgram / AssemblyAI | API key, internet | Roadmap |

El motor se elige en **Ajustes → Dictado por voz → Motor de dictado**.

WhisperX es el único que requiere instalación manual: WSL2, un venv de Python
con `whisperx`/`torch` CUDA y una GPU NVIDIA. El resto funciona sin setup local.

## Ajustes

| Ajuste | Por defecto | Qué hace |
|---|---|---|
| Motor de dictado | Windows Voice Typing (Win+H) | Win+H, `System.Speech` offline o `WhisperX local (WSL)`. |
| Probar Win+H | — | Envía el atajo y comprueba que Windows abre su barra de dictado. |
| Idioma | `es-ES` | Solo para `System.Speech`. Reconocedor instalado en Windows. Si no existe el exacto, usa el mismo idioma base. |
| Confianza mínima | 0,4 | Solo para `System.Speech`. Descarta resultados con menor confianza. |
| Espacio antes del texto | Sí | Solo para `System.Speech`. Separa el dictado de lo que ya hay escrito. |
| Enfocar el prompt al terminar | Sí | Solo para `System.Speech`. Mueve el cursor al prompt tras cada frase. |
| Probar micrófono | — | Solo para `System.Speech`. Lista los idiomas instalados y comprueba el micrófono. |
| Python del entorno | Ruta del venv de WhisperX | Solo WhisperX. Python del venv con `whisperx`. |
| Modelo (WhisperX) | `large-v3-turbo` | Solo WhisperX. `large-v3` o `medium` si necesitas otra cosa. |
| Idioma (WhisperX) | Automático | Solo WhisperX. Autodetección o `es`, `en`, `pt`. |
| Comprobar WhisperX | — | Arranca el worker y valida GPU/modelo. |

### Lectura en voz alta

| Ajuste | Por defecto | Qué hace |
|---|---|---|
| Motor de voz | Edge neural (online) | Voces neuronales de Edge, mucho más naturales. `Sistema` usa las voces SAPI instaladas, sin conexión. |
| Voz | Ximena (es-ES) | 45 voces en español, agrupadas por acento (España, México, Argentina, Colombia, Chile…). |
| Velocidad | 1× | 0,8×, 1×, 1,2× o 1,5×. |
| Ignorar bloques de código | Sí | Lee solo la prosa; omite código, rutas y comandos. |
| Probar voz | — | Lee una frase corta con la configuración actual. |

Edge neural usa la API de lectura de Microsoft Edge: es gratis y no necesita
clave, pero **requiere internet** y el texto se envía a Microsoft. Si falla, el
plugin usa automáticamente la voz del sistema.

La lectura limpia el Markdown antes de hablar: quita fences, backticks,
negritas, encabezados, viñetas y convierte `[texto](url)` en `texto`. Trocea el
texto por frases para poder detenerse rápido.

La pausa usa `speechSynthesis.pause()` / `resume()`. Con el motor de respaldo de
PowerShell (SAPI) no hay pausa real: el menú muestra solo «Leer de nuevo» y
«Detener».

## Permisos

El plugin funciona en local salvo lo que elijas y use red:

- **WhisperX**: escribe el audio en `%TEMP%\opencode-voice-dictation`, lo pasa a
  WSL y ejecuta el worker con tu venv. El audio no sale del equipo.
- **Edge**: envía el texto a Microsoft para sintetizar la voz (online).
- **Futuros motores en la nube**: enviarán el audio al proveedor que configures.

Para el dictado/lectura con Windows:

- Escribe un script `dictation-<hash>.ps1` o `speak-<hash>.ps1` en
  `%TEMP%\opencode-voice-dictation`.
- Ejecuta `powershell.exe` con ese script.
- El script abre el micrófono (`System.Speech`) y, al leer, el altavoz.

Por eso Windows y antivirus como Kaspersky pueden pedir permiso la primera vez:
es esperado. Elige **Permitir ahora** y marca **Recordar mi elección**. Si
bloqueas el micrófono, verás el aviso «No hay ningún micrófono disponible».

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| Al pulsar «Dictar» no aparece la barra de Windows | Abre Ajustes → Dictado por voz → **Probar Win+H**. Si tampoco aparece, revisa Configuración → Accesibilidad → Dictado por voz, y que Kaspersky no esté bloqueando la combinación sintética. |
| Win+H se abre pero no escribe en el prompt | Haz clic en el cuadro de texto antes de dictar; el plugin enfoca el composer, pero otra ventana pudo robar el foco. |
| Quiero dictado sin Win+H | Cambia **Motor de dictado** a `System.Speech (offline)`. |
| «El idioma de reconocimiento es-ES no está instalado» | Solo afecta a `System.Speech`. Instala el paquete de **reconocimiento** de voz, no solo el de visualización. |
| «Windows no tiene ningún reconocedor de voz instalado» | Mismo caso: no hay ningún idioma de voz instalado. |
| «No hay ningún micrófono disponible» | Revisa Configuración → Sistema → Sonido → Entrada y el micrófono predeterminado. |
| El motor se detiene inesperadamente | Otro proceso puede estar usando el micrófono en modo exclusivo. Ejecuta la prueba de micrófono en Ajustes. |
| La píldora no aparece | Comprueba que el plugin está en el `opencode.json` global, que la app corre en Windows y que el plugin figura como cargado en Ajustes → Extensiones → Plugins. |
| No transcribe nada | Sube el nivel de entrada del micrófono y baja la confianza mínima a 0,2. |
| «Windows no tiene voces instaladas para la lectura» | Instala una voz en Configuración → Hora e idioma → Voz, o revisa que `System.Speech` esté disponible. El plugin usa primero las voces de Chromium y cae a SAPI si no hay. |
| La lectura se corta o no suena | Prueba «Probar voz» en Ajustes; si suena ahí, el problema es el dispositivo de salida de la app. |
| «Abre una conversación para leer su último mensaje» | En Home o en un chat nuevo sin mensajes no hay respuesta que leer. |
| WhisperX se queda en «Transcribiendo…» | El worker no arrancó. Mira el toast: ruta del Python, CUDA o token de Hugging Face. Guía: <https://github.com/evious/opencode-voice-dictation/blob/main/docs/whisperx.md>. |
| El RPC devuelve 400 o no cargan las voces de Edge | El plugin server no cargó: Ajustes → Extensiones → Plugins → **Reload**, o reinicia el servicio. |
| WhisperX pide token de Hugging Face | `huggingface-cli login` y acepta los términos del modelo de VAD de `pyannote`. |

Los errores del plugin se registran en el log de OpenCode Desktop; los `toast`
de la app muestran los más importantes.

## Limitaciones

- La API de plugins GUI es **experimental** (`gui-experimental`) y puede
  cambiar entre versiones de OpenCode.
- `System.Speech` no añade puntuación ni mayúsculas automáticamente y su
  precisión es inferior a Whisper o al dictado nativo de Windows 11.
- **WhisperX local** requiere WSL2, Python, CUDA y una GPU NVIDIA. No es
  portable: es un motor avanzado para equipos ya preparados.
- El primer dictado con WhisperX tarda 10–30 s porque carga el modelo en la GPU;
  los siguientes son rápidos.
- El modo Win+H envía la combinación con `keybd_event`. Kaspersky o la
  protección UIPI de Windows pueden bloquearla; en ese caso usa `System.Speech`.
- Con Win+H el texto lo escribe Windows en el campo enfocado: el plugin no
  puede descartarlo si cambias de sesión ni limpiarlo.
- No hay resultados parciales con `System.Speech`: el texto aparece al terminar
  cada frase.
- La lectura usa las voces del sistema; si Electron no las expone, el respaldo
  por PowerShell usa las voces SAPI, con una latencia de arranque de ~0,5 s.
- La lectura empieza con el mensaje tal como esté en ese momento: si el agente
  sigue escribiendo, leerá la versión parcial.
- Una sola dictación a la vez (hay un micrófono). Si empiezas en otra ventana,
  la anterior se detiene.
- Si cambias de sesión durante el dictado, el texto se descarta con un aviso
  para no escribirlo en la sesión equivocada.

El dictado vive en `src/gui` (Win+H y System.Speech) y en el servidor
(`src/whisper` para WhisperX y `src/edge.ts` para la lectura). Para añadir un
motor nuevo, consulta la sección siguiente.

## Añadir un motor de dictado nuevo

La ventana ya graba el audio (`getUserMedia` + `MediaRecorder`) y lo envía por
RPC al servidor. Eso es reutilizable para cualquier motor: local o en la nube.

1. **Contrato RPC** (`src/rpc.ts`): añade un método
   `transcribe({ audio, mime, language, ... })` o uno por motor.
2. **Servidor** (`src/index.ts`): implementa el método. Para la nube, llama al
   proveedor desde el servidor, nunca desde la ventana.
3. **Ajustes** (`src/gui/settings.tsx`): añade el motor al selector y sus campos
   (API key, idioma, modelo).
4. **Ventana** (`src/gui/window.tsx`): enruta el modo del motor a la grabación y
   al RPC; inserta con `composer.insert()` o copia con `ctx.system.copy()` si
   quieres dictar hacia otra app.

Proveedores previstos:

- **Google Cloud Speech-to-Text**: cuenta de servicio o API key,
  `@google-cloud/speech`, audio `WEBM_OPUS` o `LINEAR16` 16 kHz.
- **OpenAI**: `gpt-4o-transcribe` o `whisper-1`,
  `POST /v1/audio/transcriptions`, API key.
- **Deepgram / AssemblyAI**: `POST /v1/listen`, API key.
- **`whisper.cpp` nativo**: binario + modelo `ggml`, sin WSL ni Python; la
  opción más portable para uso local.

Las claves de API no deben viajar al renderer. Guárdalas en el store del plugin
o, mejor, en variables de entorno del servidor.

## Desarrollo

```
src/
├── index.ts                 Parte servidor: registra los RPC de Edge y WhisperX
├── rpc.ts                   Contrato RPC compartido (voces, síntesis, dictado)
├── edge.ts                  Voces y síntesis de Edge (servidor)
├── whisper/
│   ├── server.ts            Worker persistente, spawn WSL/Node, timeouts
│   └── worker.py            WhisperX en la GPU; protocolo JSON por stdin/stdout
├── gui.tsx                  Entrada ./gui-experimental
└── gui/
    ├── definition.ts        os, stores, i18n es/en
    ├── contract.ts          Ipc: dictado y lectura
    ├── window.tsx           Píldoras, comandos e inserción de texto
    ├── recorder.ts          getUserMedia + MediaRecorder para WhisperX
    ├── main.ts              Dictado Win+H / System.Speech y voz SAPI
    ├── speak.ts             Limpieza de Markdown, troceado, Edge y speechSynthesis
    ├── settings.tsx         Página de ajustes
    └── engines/
        ├── script.ts        Script de PowerShell para el dictado
        ├── system-speech.ts Spawn, parseo de JSON, diagnose, taskkill
        ├── speak-script.ts  Script de PowerShell para la lectura
        └── sapi-speech.ts   Voz de respaldo y listado de voces SAPI
```

La guía de WhisperX está en [`docs/whisperx.md`](docs/whisperx.md).

`npm run typecheck` valida los tipos, `npm run build` genera el bundle CJS y
`npm test` ejecuta el smoke test (`test/smoke.cjs`): simula el host de la app,
un `powershell.exe` falso, la API de voz del navegador, el RPC de Edge y la
grabadora de WhisperX para comprobar dictado, lectura, limpieza de Markdown,
pausa, cancelación, fallback y errores.

## Publicar

Mantenedores:

```bash
npm login
npm version patch   # o minor / major
npm publish
git push --tags
```

El workflow de release publica en npm al empujar un tag `v*`. Configura el
secreto `NPM_TOKEN` en GitHub, o usa Trusted Publishing con OIDC.
