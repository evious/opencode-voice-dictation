import { Plugin } from "@opencode/plugin/tui"
import { VoiceRpc } from "./rpc.js"
import { chunkForSpeech, cleanForSpeech } from "./speech-text.js"
import { speakSapi } from "./sapi-speech.js"
import { playMp3Base64 as playMp3Windows } from "./tui/player.js"
import { insertIntoPrompt } from "./tui/insert.js"
import { startLinuxRecording, type LinuxRecording } from "./tui/linux/dictation.js"
import { playMp3Base64 as playMp3Linux, speakLinux } from "./tui/linux/playback.js"
import { sendVoiceTypingShortcut } from "./win-h.js"

const DEFAULT_VOICE = "es-ES-XimenaNeural"
const DEFAULT_RATE = 1
const DEFAULT_MODEL = "base-q5_1"
const DEFAULT_LANGUAGE = "auto"
const DEFAULT_MAX_SECONDS = 60
const MAX_EDGE_CHUNK = 4000

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

    const voice = optionString("voice", DEFAULT_VOICE)
    const rate = Math.max(0.5, Math.min(2, optionNumber("rate", DEFAULT_RATE)))
    const skipCode = optionBoolean("skipCode", true)
    const model = optionString("model", DEFAULT_MODEL)
    const language = optionString("language", DEFAULT_LANGUAGE)
    const maxSeconds = Math.max(5, Math.min(300, Math.round(optionNumber("maxSeconds", DEFAULT_MAX_SECONDS))))
    const insertMode = optionString("insert", "auto")
    const ttsEngine = optionString("engine", "edge")

    const isWin = process.platform === "win32"
    const isLinux = process.platform === "linux"
    const rpc = context.client.rpc(VoiceRpc)

    let generation = 0
    let busy = false
    let paused = false
    let active: Active | undefined
    let recording: LinuxRecording | undefined
    let transcribing = false
    let prepared = false

    const toast = (message: string, variant: "info" | "success" | "warning" | "error" = "info") => {
      context.ui.toast.show({ title: "Dictado por voz", message, variant })
    }

    const stop = () => {
      generation++
      active?.stop()
      active = undefined
      busy = false
      paused = false
    }

    const cancelRecording = () => {
      const current = recording
      recording = undefined
      current?.cancel()
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
          ? speakSapi({ text, rate, voice: "" }, onDone)
          : speakLinux(text, rate, onDone)

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
      toast("Transcribiendo…", "info")

      try {
        const captured = await current.stop()
        const result = (await rpc.whisperCppTranscribe({
          audio: captured.audio,
          mime: captured.mime,
          language,
          model,
        })) as { text: string; language: string }

        const text = result.text.trim()
        if (!text) {
          toast("No se entendió el audio.", "info")
          return
        }

        const inserted = await insertIntoPrompt(context, text, { mode: insertMode })
        if (!inserted.ok) {
          toast(inserted.message, "error")
          return
        }

        if (inserted.message) toast(inserted.message, "info")
        else toast("Dictado insertado.", "success")
      } catch (error) {
        toast(`No se pudo transcribir: ${errorMessage(error)}`, "error")
      } finally {
        transcribing = false
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

      try {
        recording = await startLinuxRecording({ maxSeconds })
        toast(`Grabando… Pulsa /dictado otra vez para parar (máx. ${maxSeconds}s).`, "info")
      } catch (error) {
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
        const cleaned = cleanForSpeech(text, skipCode)
        if (!cleaned) {
          toast("La última respuesta no tiene texto para leer.", "info")
          return
        }

        if (ttsEngine === "system") {
          await speakSystem(cleaned, current)
          return
        }

        let edgeFailed = false
        for (const chunk of chunkForSpeech(cleaned, MAX_EDGE_CHUNK)) {
          if (current !== generation) return

          let audio: string
          try {
            const result = (await rpc.edgeSpeak({ text: chunk, voice, rate })) as string
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
        if (current === generation) busy = false
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
        toast("Lectura reanudada.", "info")
      } else {
        active.pause()
        paused = true
        toast("Lectura pausada.", "info")
      }
    }

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
          slash: { name: "pausar", aliases: ["pause"] },
          suggested: false,
          run: togglePause,
        },
      ],
      bindings: ["voice-dictation.tui.dictate", "voice-dictation.tui.read", "voice-dictation.tui.pause"],
    }))

    return () => {
      stop()
      cancelRecording()
    }
  },
})
