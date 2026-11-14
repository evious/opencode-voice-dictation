import { Plugin } from "@opencode/plugin/tui"
import { homedir } from "node:os"
import { join } from "node:path"
import { VoiceRpc } from "./rpc.js"
import { chunkForSpeech, cleanForSpeech } from "./speech-text.js"
import { speakSapi } from "./sapi-speech.js"
import { playMp3Base64 as playMp3Windows } from "./tui/player.js"
import { insertIntoPrompt } from "./tui/insert.js"
import { startLinuxRecording, type LinuxRecording } from "./tui/linux/dictation.js"
import { playMp3Base64 as playMp3Linux, speakLinux } from "./tui/linux/playback.js"
import { createStatusController, type StatusController } from "./tui/status.js"
import { sendVoiceTypingShortcut } from "./win-h.js"

const DEFAULT_VOICE = "es-ES-XimenaNeural"
const DEFAULT_RATE = 1
const DEFAULT_MODEL = "base-q5_1"
const DEFAULT_LANGUAGE = "auto"
const DEFAULT_MAX_SECONDS = 60
const MAX_EDGE_CHUNK = 4000

type TuiSettings = {
  model: string
  language: string
  maxSeconds: number
  insert: string
  engine: string
  voice: string
  rate: number
  skipCode: boolean
}

type Active = {
  stop(): void
  pause?(): void
  resume?(): void
}

type SpeechHandle = {
  stop(): void
  pause?(): void
  resume?(): void
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>

    for (const key of ["message", "error", "detail", "defect"]) {
      const found = value[key]
      if (typeof found === "string" && found) return found
    }

    const data = value.data
    if (data && typeof data === "object") {
      const message = (data as Record<string, unknown>).message
      if (typeof message === "string" && message) return message
    }
  }

  return "error desconocido"
}

export default Plugin.define({
  id: "voice-dictation.tui",
  setup(context) {
    const optionString = (key: string, fallback: string) => {
      const value = context.options[key]
      return typeof value === "string" && value.length > 0 ? value : fallback
    }
    const optionNumber = (key: string, fallback: number) => {
      const value = context.options[key]
      return typeof value === "number" && Number.isFinite(value) ? value : fallback
    }
    const optionBoolean = (key: string, fallback: boolean) => {
      const value = context.options[key]
      return typeof value === "boolean" ? value : fallback
    }

    const initial: TuiSettings = {
      model: optionString("model", DEFAULT_MODEL),
      language: optionString("language", DEFAULT_LANGUAGE),
      maxSeconds: Math.max(5, Math.min(300, Math.round(optionNumber("maxSeconds", DEFAULT_MAX_SECONDS)))),
      insert: optionString("insert", "auto"),
      engine: optionString("engine", "edge"),
      voice: optionString("voice", DEFAULT_VOICE),
      rate: Math.max(0.5, Math.min(2, optionNumber("rate", DEFAULT_RATE))),
      skipCode: optionBoolean("skipCode", true),
    }

    const [settings, updateSettings] = context.storage.store<TuiSettings>("settings", { initial })

    const isWin = process.platform === "win32"
    const isLinux = process.platform === "linux"
    const rpc = context.client.rpc(VoiceRpc)
    const configRoot = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
    const cliPath = join(configRoot, "opencode", "cli.json")

    let generation = 0
    let busy = false
    let paused = false
    let active: Active | undefined
    let recording: LinuxRecording | undefined
    let transcribing = false
    let prepared = false
    let pasteHintShown = false
    let status: StatusController | undefined

    const toast = (message: string, variant: "info" | "success" | "warning" | "error" = "info") => {
      context.ui.toast.show({ title: "Dictado por voz", message, variant })
    }

    const stop = () => {
      generation++
      active?.stop()
      active = undefined
      busy = false
      paused = false
      status?.setMode("idle")
    }

    const cancelRecording = () => {
      const current = recording
      recording = undefined
      current?.cancel()
      status?.setMode("idle")
    }

    const speakSystem = (text: string, current: number) => {
      return new Promise<void>((resolve) => {
        let settled = false
        let wrapper: Active | undefined

        const finish = () => {
          if (settled) return
          settled = true
          if (active === wrapper) active = undefined
          resolve()
        }

        const onDone = (ok: boolean) => {
          if (!ok && current === generation) {
            toast("Tampoco se pudo reproducir con la voz del sistema.", "error")
          }
          finish()
        }

        const handle: SpeechHandle = isWin
          ? speakSapi({ text, rate: settings.rate, voice: "" }, onDone)
          : speakLinux(text, settings.rate, onDone)

        wrapper = {
          stop() {
            handle.stop()
            finish()
          },
          ...(handle.pause ? { pause: () => handle.pause!() } : {}),
          ...(handle.resume ? { resume: () => handle.resume!() } : {}),
        }

        if (!settled) active = wrapper
        if (current !== generation) {
          handle.stop()
          finish()
        }
      })
    }

    const ensureWhisperCpp = async (): Promise<boolean> => {
      if (prepared) return true
      const model = settings.model

      type Status = {
        installed: boolean
        ready: boolean
        model: string
        error: string
        ffmpeg: boolean
        ffmpegVersion: string
        ffmpegPath: string
      }

      try {
        const caps = (await rpc.capabilities({})) as { platform: string; engines: string[] }
        if (caps.platform !== "linux" || !caps.engines.includes("whispercpp")) {
          toast("El servidor de OpenCode no es Linux; whisper.cpp no está disponible en él.", "error")
          return false
        }

        let status = (await rpc.whisperCppStatus({ model })) as Status
        if (status.error) {
          toast(`whisper.cpp no está listo: ${status.error}`, "error")
          return false
        }

        if (!status.installed) {
          const accepted = await context.ui.dialog.confirm({
            title: "whisper.cpp",
            message: `Falta el motor o el modelo ${model}. ¿Descargarlo ahora?`,
            label: { confirm: "Descargar", cancel: "Cancelar" },
          })

          if (!accepted) {
            toast("Dictado cancelado: falta whisper.cpp. Puedes instalarlo desde Ajustes de Desktop.", "warning")
            return false
          }

          toast("Descargando whisper.cpp…", "info")
          const install = (await rpc.whisperCppInstall({ model })) as { ok: boolean; model: string; error: string }
          if (!install.ok) {
            toast(`No se pudo instalar whisper.cpp: ${install.error}`, "error")
            return false
          }

          status = (await rpc.whisperCppStatus({ model })) as Status
        }

        if (!status.ffmpeg) {
          const accepted = await context.ui.dialog.confirm({
            title: "ffmpeg",
            message: "ffmpeg es necesario para convertir el audio. ¿Instalarlo ahora?",
            label: { confirm: "Instalar", cancel: "Cancelar" },
          })

          if (!accepted) {
            toast("ffmpeg es necesario. Instálalo con: sudo apt install -y ffmpeg", "warning")
            return false
          }

          const install = (await rpc.whisperCppInstallFfmpeg({})) as {
            ok: boolean
            error: string
            command: string
          }
          if (!install.ok) {
            const command = install.command ? ` ${install.command}` : ""
            toast(`No se pudo instalar ffmpeg: ${install.error}.${command}`, "error")
            return false
          }

          status = (await rpc.whisperCppStatus({ model })) as Status
        }

        if (!status.installed || !status.ffmpeg) {
          toast("whisper.cpp o ffmpeg siguen sin estar listos.", "error")
          return false
        }

        prepared = true
        return true
      } catch (error) {
        toast(`No se pudo comprobar whisper.cpp: ${errorMessage(error)}`, "error")
        return false
      }
    }

    const stopLinux = async () => {
      const current = recording
      recording = undefined
      if (!current) return

      transcribing = true
      status?.setMode("transcribing")
      toast("Transcribiendo…", "info")

      try {
        const captured = await current.stop()
        const result = (await rpc.whisperCppTranscribe({
          audio: captured.audio,
          mime: captured.mime,
          language: settings.language,
          model: settings.model,
        })) as { text: string; language: string }

        const text = result.text.trim()
        if (!text) {
          toast("No se entendió el audio.", "info")
          return
        }

        const inserted = await insertIntoPrompt(context, text, { mode: settings.insert })
        if (!inserted.ok) {
          toast(inserted.message, "error")
          return
        }

        const multiline = text.includes("\n")
        const hint = multiline && !pasteHintShown
        if (hint) pasteHintShown = true
        const extra = hint
          ? ` Si la TUI muestra «pegó N líneas», pon "prompt.paste": "full" en ${cliPath} para ver el texto completo.`
          : ""

        if (inserted.message) toast(inserted.message + extra, "info")
        else if (extra) toast(`Dictado insertado.${extra}`, "info")
        else toast("Dictado insertado.", "success")
      } catch (error) {
        toast(`No se pudo transcribir: ${errorMessage(error)}`, "error")
      } finally {
        transcribing = false
        status?.setMode("idle")
      }
    }

    const dictateLinux = async () => {
      if (recording) {
        await stopLinux()
        return
      }

      if (transcribing) {
        toast("Espera a que termine la transcripción.", "info")
        return
      }

      if (active) stop()

      const route = context.ui.router.current()
      if (route.type !== "session") {
        toast("Abre una sesión para dictar en el prompt.", "warning")
        return
      }

      if (!(await ensureWhisperCpp())) return
      const maxSeconds = Math.max(5, Math.min(300, Math.round(settings.maxSeconds)))

      try {
        recording = await startLinuxRecording({ maxSeconds })
        status?.setMode("recording")
        toast(`Grabando… Pulsa /dictado otra vez para parar (máx. ${maxSeconds}s).`, "info")
      } catch (error) {
        status?.setMode("idle")
        toast(`No se pudo grabar: ${errorMessage(error)}`, "error")
      }
    }

    const dictateWindows = async () => {
      if (active) stop()

      try {
        await sendVoiceTypingShortcut()
        toast("Dictado de Windows abierto. Habla y el texto aparecerá en el prompt.", "info")
      } catch (error) {
        toast(`No se pudo abrir el dictado: ${errorMessage(error)}`, "error")
      }
    }

    const dictate = async () => {
      if (isWin) return dictateWindows()
      if (isLinux) return dictateLinux()
      toast("El dictado de la TUI solo está disponible en Windows y Linux.", "warning")
    }

    const read = async () => {
      if (busy || active) {
        stop()
        toast("Lectura detenida.", "info")
        return
      }

      if (recording) {
        cancelRecording()
        toast("Dictado cancelado para no capturar la lectura.", "warning")
      }

      if (transcribing) {
        toast("Espera a que termine la transcripción.", "info")
        return
      }

      const route = context.ui.router.current()
      if (route.type !== "session") {
        toast("Abre una sesión para leer su última respuesta.", "warning")
        return
      }

      const current = ++generation
      busy = true
      paused = false

      try {
        const response = await context.client.message.list({
          sessionID: route.sessionID,
          type: "assistant",
          order: "desc",
          limit: 10,
        })
        if (current !== generation) return

        const message = response.data.find(
          (entry) =>
            entry.type === "assistant" &&
            entry.content.some((part) => part.type === "text" && part.text.trim().length > 0),
        )
        if (!message || message.type !== "assistant") {
          toast("No hay una respuesta para leer.", "info")
          return
        }

        const text = message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n")
        const cleaned = cleanForSpeech(text, settings.skipCode)
        if (!cleaned) {
          toast("La última respuesta no tiene texto para leer.", "info")
          return
        }

        status?.setMode("reading")

        if (settings.engine === "system") {
          await speakSystem(cleaned, current)
          return
        }

        let edgeFailed = false
        for (const chunk of chunkForSpeech(cleaned, MAX_EDGE_CHUNK)) {
          if (current !== generation) return

          let audio: string
          try {
            const result = (await rpc.edgeSpeak({
              text: chunk,
              voice: settings.voice,
              rate: settings.rate,
            })) as string
            if (typeof result !== "string" || result.length === 0) {
              edgeFailed = true
              break
            }
            audio = result
          } catch {
            edgeFailed = true
            break
          }
          if (current !== generation) return

          const playback = await (isWin ? playMp3Windows(audio) : playMp3Linux(audio))
          active = playback
          const ok = await playback.done
          if (active === playback) active = undefined
          if (current !== generation) return

          if (!ok) {
            edgeFailed = true
            break
          }
        }

        if (!edgeFailed || current !== generation) return

        toast("No se pudo usar Edge. Usando la voz del sistema.", "warning")
        await speakSystem(cleaned, current)
      } catch (error) {
        if (current === generation) {
          toast(`No se pudo leer la respuesta: ${errorMessage(error)}`, "error")
        }
      } finally {
        if (current === generation) {
          busy = false
          status?.setMode("idle")
        }
      }
    }

    const togglePause = () => {
      if (!active) {
        toast("No hay una lectura activa.", "info")
        return
      }

      if (!active.pause || !active.resume) {
        toast("Este reproductor no permite pausar; puedes detener con /leer.", "warning")
        return
      }

      if (paused) {
        active.resume()
        paused = false
        status?.setMode("reading")
        toast("Lectura reanudada.", "info")
      } else {
        active.pause()
        paused = true
        status?.setMode("paused")
        toast("Lectura pausada.", "info")
      }
    }

    const settingsMenu = async () => {
      while (true) {
        const options: Array<{ title: string; value: string; description?: string }> = []

        if (isLinux) {
          options.push(
            { title: "Modelo", value: "model", description: settings.model },
            { title: "Idioma", value: "language", description: settings.language },
            { title: "Duración máxima", value: "maxSeconds", description: `${settings.maxSeconds} s` },
            { title: "Inserción", value: "insert", description: settings.insert },
          )
        }

        options.push(
          { title: "Motor de lectura", value: "engine", description: settings.engine },
          { title: "Voz", value: "voice", description: settings.voice },
          { title: "Velocidad", value: "rate", description: `${settings.rate}×` },
          { title: "Omitir código", value: "skipCode", description: settings.skipCode ? "sí" : "no" },
          { title: "Ver texto completo al dictar", value: "paste", description: "Cómo mostrar todas las líneas" },
        )

        if (isLinux) {
          options.push(
            { title: "Comprobar whisper.cpp", value: "status", description: "Motor, modelo y ffmpeg" },
            { title: "Instalar whisper.cpp", value: "install", description: "Descargar el motor/modelo" },
            { title: "Instalar ffmpeg", value: "ffmpeg", description: "Conversión de audio" },
          )
        }

        options.push(
          { title: "Restablecer", value: "reset", description: "Valores de opencode.jsonc" },
          { title: "Salir", value: "done" },
        )

        const choice = await context.ui.dialog.select({
          title: "Ajustes de dictado por voz",
          options,
        })

        if (!choice || choice === "done") return

        if (choice === "model") {
          const value = await context.ui.dialog.select({
            title: "Modelo whisper.cpp",
            current: settings.model,
            options: [
              { title: "base-q5_1", value: "base-q5_1", description: "57 MB · recomendado" },
              { title: "small-q5_1", value: "small-q5_1", description: "180 MB · más preciso" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.model = value
            })
            prepared = false
          }
          continue
        }

        if (choice === "language") {
          const value = await context.ui.dialog.select({
            title: "Idioma del dictado",
            current: settings.language,
            options: [
              { title: "Automático", value: "auto" },
              { title: "Español", value: "es" },
              { title: "English", value: "en" },
              { title: "Português", value: "pt" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.language = value
            })
          }
          continue
        }

        if (choice === "maxSeconds") {
          const value = await context.ui.dialog.select({
            title: "Duración máxima de grabación",
            current: String(settings.maxSeconds),
            options: [
              { title: "30 segundos", value: "30" },
              { title: "60 segundos", value: "60" },
              { title: "120 segundos", value: "120" },
              { title: "300 segundos", value: "300" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.maxSeconds = Number(value)
            })
          }
          continue
        }

        if (choice === "insert") {
          const value = await context.ui.dialog.select({
            title: "Cómo insertar el texto",
            current: settings.insert,
            options: [
              { title: "Automático", value: "auto", description: "appendPrompt → xdotool/portapapeles" },
              { title: "Escribir", value: "type", description: "xdotool/wtype" },
              { title: "Portapapeles", value: "clipboard", description: "Copia y no pega automáticamente" },
              { title: "appendPrompt", value: "append", description: "Solo si la TUI lo expone" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.insert = value
            })
          }
          continue
        }

        if (choice === "engine") {
          const value = await context.ui.dialog.select({
            title: "Motor de lectura",
            current: settings.engine,
            options: [
              { title: "Edge (online)", value: "edge" },
              { title: "Sistema (offline)", value: "system" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.engine = value
            })
          }
          continue
        }

        if (choice === "voice") {
          let voices: Array<{ id: string; label: string }> = []

          try {
            const result = (await rpc.edgeVoices({})) as Array<{ id: string; label: string }>
            voices = result.map((voice) => ({ id: voice.id, label: voice.label }))
          } catch {
            voices = []
          }

          if (voices.length === 0) {
            voices = [
              { id: settings.voice, label: `${settings.voice} (actual)` },
              { id: "es-ES-XimenaNeural", label: "es-ES · Ximena" },
              { id: "es-MX-DaliaNeural", label: "es-MX · Dalia" },
            ]
          } else if (!voices.some((voice) => voice.id === settings.voice)) {
            voices.unshift({ id: settings.voice, label: `${settings.voice} (actual)` })
          }

          const value = await context.ui.dialog.select({
            title: "Voz de lectura",
            current: settings.voice,
            options: voices.map((voice) => ({
              title: voice.label,
              value: voice.id,
              description: voice.id,
            })),
          })
          if (value) {
            await updateSettings((draft) => {
              draft.voice = value
            })
          }
          continue
        }

        if (choice === "rate") {
          const value = await context.ui.dialog.select({
            title: "Velocidad de lectura",
            current: String(settings.rate),
            options: [
              { title: "0,8×", value: "0.8" },
              { title: "1×", value: "1" },
              { title: "1,2×", value: "1.2" },
              { title: "1,5×", value: "1.5" },
            ],
          })
          if (value) {
            await updateSettings((draft) => {
              draft.rate = Number(value)
            })
          }
          continue
        }

        if (choice === "skipCode") {
          const value = await context.ui.dialog.confirm({
            title: "Omitir bloques de código",
            message: "¿Omitir el código al leer en voz alta?",
            label: { confirm: "Sí", cancel: "No" },
          })
          if (value !== undefined) {
            await updateSettings((draft) => {
              draft.skipCode = value
            })
          }
          continue
        }

        if (choice === "paste") {
          await context.ui.dialog.alert({
            title: "Ver texto completo al dictar",
            message: [
              "La TUI compacta los pegados largos como «pegó N líneas».",
              "Para ver y corregir todo el texto, añade esto a tu cli.json:",
              "",
              '{ "prompt": { "paste": "full" } }',
              "",
              `Archivo: ${cliPath}`,
              "",
              "Si no existe, créalo con ese contenido. Se recarga en vivo.",
              "El plugin no modifica ese archivo.",
            ].join("\n"),
          })
          continue
        }

        if (choice === "status") {
          try {
            const status = (await rpc.whisperCppStatus({ model: settings.model })) as {
              installed: boolean
              model: string
              error: string
              ffmpeg: boolean
              ffmpegVersion: string
            }

            await context.ui.dialog.alert({
              title: "whisper.cpp",
              message: [
                `Motor/modelo: ${status.installed ? "instalado" : "no instalado"}`,
                `Modelo: ${status.model}`,
                `ffmpeg: ${status.ffmpeg ? status.ffmpegVersion : "no instalado"}`,
                `Error: ${status.error || "—"}`,
              ].join("\n"),
            })
          } catch (error) {
            toast(`No se pudo comprobar whisper.cpp: ${errorMessage(error)}`, "error")
          }
          continue
        }

        if (choice === "install") {
          const accepted = await context.ui.dialog.confirm({
            title: "whisper.cpp",
            message: `¿Descargar el modelo ${settings.model} y el motor?`,
            label: { confirm: "Descargar", cancel: "Cancelar" },
          })
          if (!accepted) continue

          toast("Descargando whisper.cpp…", "info")
          try {
            const result = (await rpc.whisperCppInstall({ model: settings.model })) as {
              ok: boolean
              model: string
              error: string
            }
            if (result.ok) {
              prepared = false
              toast(`whisper.cpp instalado: ${result.model}`, "success")
            } else {
              toast(`No se pudo instalar whisper.cpp: ${result.error}`, "error")
            }
          } catch (error) {
            toast(`No se pudo instalar whisper.cpp: ${errorMessage(error)}`, "error")
          }
          continue
        }

        if (choice === "ffmpeg") {
          const accepted = await context.ui.dialog.confirm({
            title: "ffmpeg",
            message: "ffmpeg es necesario para convertir el audio. ¿Instalarlo ahora?",
            label: { confirm: "Instalar", cancel: "Cancelar" },
          })
          if (!accepted) continue

          try {
            const result = (await rpc.whisperCppInstallFfmpeg({})) as {
              ok: boolean
              error: string
              command: string
            }
            if (result.ok) {
              toast("ffmpeg instalado.", "success")
            } else {
              const command = result.command ? ` ${result.command}` : ""
              toast(`No se pudo instalar ffmpeg: ${result.error}.${command}`, "error")
            }
          } catch (error) {
            toast(`No se pudo instalar ffmpeg: ${errorMessage(error)}`, "error")
          }
          continue
        }

        if (choice === "reset") {
          const accepted = await context.ui.dialog.confirm({
            title: "Restablecer ajustes",
            message: "¿Volver a los valores de opencode.jsonc?",
            label: { confirm: "Restablecer", cancel: "Cancelar" },
          })
          if (!accepted) continue

          await updateSettings((draft) => {
            Object.assign(draft, initial)
          })
          prepared = false
          toast("Ajustes restablecidos.", "success")
        }
      }
    }

    status = createStatusController(context, {
      dictate: () => dictate(),
      read: () => read(),
      pause: togglePause,
    })

    context.keymap.layer(() => ({
      mode: "global",
      priority: 10,
      commands: [
        {
          id: "voice-dictation.tui.dictate",
          title: "Dictar por voz",
          description: isLinux
            ? "Graba con el micrófono y transcribe con whisper.cpp."
            : "Abre el dictado de Windows (Win+H) en el prompt.",
          group: "Voz",
          bind: "<leader>d",
          palette: true,
          slash: { name: "dictado", aliases: ["dictate"] },
          suggested: true,
          run: dictate,
        },
        {
          id: "voice-dictation.tui.read",
          title: "Leer última respuesta",
          description: "Lee en voz alta la última respuesta con voces Edge.",
          group: "Voz",
          bind: "<leader>v",
          palette: true,
          slash: { name: "leer", aliases: ["read"] },
          suggested: true,
          run: read,
        },
        {
          id: "voice-dictation.tui.pause",
          title: "Pausar o reanudar la lectura",
          description: "Pausa o reanuda la lectura en voz alta.",
          group: "Voz",
          bind: "<leader>p",
          palette: true,
          slash: { name: "pausar", aliases: ["pause", "pausa"] },
          suggested: false,
          run: togglePause,
        },
        {
          id: "voice-dictation.tui.settings",
          title: "Ajustes de dictado por voz",
          description: "Modelo, idioma, inserción, voz y velocidad.",
          group: "Voz",
          palette: true,
          slash: { name: "ajustes-voz", aliases: ["voice-settings"] },
          suggested: false,
          run: settingsMenu,
        },
      ],
      bindings: ["voice-dictation.tui.dictate", "voice-dictation.tui.read", "voice-dictation.tui.pause"],
    }))

    return () => {
      stop()
      cancelRecording()
      status?.dispose()
    }
  },
})
