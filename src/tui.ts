import { Plugin } from "@opencode/plugin/tui"
import { VoiceRpc } from "./rpc.js"
import { chunkForSpeech, cleanForSpeech } from "./speech-text.js"
import { speakSapi, type SpeakHandle } from "./sapi-speech.js"
import { playMp3Base64, type Playback } from "./tui/player.js"
import { sendVoiceTypingShortcut } from "./win-h.js"

const DEFAULT_VOICE = "es-ES-XimenaNeural"
const DEFAULT_RATE = 1
const MAX_EDGE_CHUNK = 4000

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "error desconocido"
}

export default Plugin.define({
  id: "voice-dictation.tui",
  setup(context) {
    const voice = typeof context.options.voice === "string" ? context.options.voice : DEFAULT_VOICE
    const rate = typeof context.options.rate === "number" ? context.options.rate : DEFAULT_RATE
    const skipCode = typeof context.options.skipCode === "boolean" ? context.options.skipCode : true

    let generation = 0
    let busy = false
    let active: { stop(): void } | undefined

    const stop = () => {
      generation++
      active?.stop()
      active = undefined
      busy = false
    }

    const dictate = async () => {
      if (process.platform !== "win32") {
        context.ui.toast.show({
          title: "Dictado por voz",
          message: "El dictado de la TUI está disponible solo en Windows por ahora.",
          variant: "warning",
        })
        return
      }

      try {
        await sendVoiceTypingShortcut()
        context.ui.toast.show({
          title: "Dictado por voz",
          message: "Dictado de Windows abierto. Habla y el texto aparecerá en el prompt.",
          variant: "info",
        })
      } catch (error) {
        context.ui.toast.show({
          title: "Dictado por voz",
          message: `No se pudo abrir el dictado: ${errorMessage(error)}`,
          variant: "error",
        })
      }
    }

    const speakSystem = (text: string, current: number) => {
      return new Promise<void>((resolve) => {
        let settled = false
        let wrapper: { stop(): void } | undefined

        const finish = () => {
          if (settled) return
          settled = true
          if (active === wrapper) active = undefined
          resolve()
        }

        const handle: SpeakHandle = speakSapi({ text, rate, voice: "" }, (ok) => {
          if (!ok && current === generation) {
            context.ui.toast.show({
              title: "Dictado por voz",
              message: "Tampoco se pudo reproducir con la voz del sistema.",
              variant: "error",
            })
          }
          finish()
        })

        wrapper = {
          stop() {
            handle.stop()
            finish()
          },
        }
        active = wrapper

        if (current !== generation) {
          handle.stop()
          finish()
        }
      })
    }

    const read = async () => {
      if (busy || active) {
        stop()
        context.ui.toast.show({
          title: "Dictado por voz",
          message: "Lectura detenida.",
          variant: "info",
        })
        return
      }

      if (process.platform !== "win32") {
        context.ui.toast.show({
          title: "Dictado por voz",
          message: "La lectura de la TUI está disponible solo en Windows por ahora.",
          variant: "warning",
        })
        return
      }

      const route = context.ui.router.current()
      if (route.type !== "session") {
        context.ui.toast.show({
          title: "Dictado por voz",
          message: "Abre una sesión para leer su última respuesta.",
          variant: "warning",
        })
        return
      }

      const current = ++generation
      busy = true

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
          context.ui.toast.show({
            title: "Dictado por voz",
            message: "No hay una respuesta para leer.",
            variant: "info",
          })
          return
        }

        const text = message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n")
        const cleaned = cleanForSpeech(text, skipCode)
        if (!cleaned) {
          context.ui.toast.show({
            title: "Dictado por voz",
            message: "La última respuesta no tiene texto para leer.",
            variant: "info",
          })
          return
        }

        let edgeFailed = false
        for (const chunk of chunkForSpeech(cleaned, MAX_EDGE_CHUNK)) {
          if (current !== generation) return

          let audio: string
          try {
            const result = await context.client.rpc(VoiceRpc).edgeSpeak({ text: chunk, voice, rate })
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

          const playback: Playback = playMp3Base64(audio)
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

        context.ui.toast.show({
          title: "Dictado por voz",
          message: "No se pudo usar Edge. Usando la voz del sistema.",
          variant: "warning",
        })
        await speakSystem(cleaned, current)
      } catch (error) {
        if (current === generation) {
          context.ui.toast.show({
            title: "Dictado por voz",
            message: `No se pudo leer la respuesta: ${errorMessage(error)}`,
            variant: "error",
          })
        }
      } finally {
        if (current === generation) busy = false
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      priority: 10,
      commands: [
        {
          id: "voice-dictation.tui.dictate",
          title: "Dictar por voz",
          description: "Abre el dictado de Windows (Win+H) en el prompt.",
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
      ],
      bindings: ["voice-dictation.tui.dictate", "voice-dictation.tui.read"],
    }))

    return () => stop()
  },
})
