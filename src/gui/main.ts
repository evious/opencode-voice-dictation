import type { Plugin } from "@opencode/plugin/gui"
import { Dictation, Speech } from "./contract"
import { diagnose, startEngine, type EngineHandle } from "./engines/system-speech"
import { listSapiVoices, speakSapi, type SpeakHandle } from "./engines/sapi-speech"

type Status = "idle" | "starting" | "listening" | "error"

/**
 * Runs once in the Electron main process.
 *
 * One dictation runs at a time (there is one microphone); the window that
 * starts it receives the transcript events.
 */
export const main: Plugin.MainSetup = (ctx) => {
  let status: Status = "idle"
  let error = ""
  let locale = ""
  let handle: EngineHandle | undefined
  let stopping = false

  const reset = () => {
    handle = undefined
    stopping = false
  }

  const dictation = ctx.provide(Dictation, {
    state: () => ({ status, error, locale }),

    start(input, caller) {
      if (handle) {
        stopping = true
        handle.stop()
        reset()
      }

      status = "starting"
      error = ""
      locale = input.locale
      dictation.changed()

      const target = caller.window

      try {
        handle = startEngine(
          { locale: input.locale, minConfidence: input.minConfidence },
          {
            onReady(selected) {
              status = "listening"
              locale = selected
              dictation.changed()
            },
            onFinal(text, confidence) {
              dictation.emit("final", { text, confidence }, target)
            },
            onError(code, detail, available) {
              status = "error"
              error = code
              dictation.changed()
              dictation.emit("error", { code, detail, available }, target)
            },
            onExit(code, detail) {
              if (stopping) {
                reset()
                status = "idle"
                error = ""
                locale = ""
                dictation.changed()
                return
              }

              reset()
              if (status !== "error") {
                status = "error"
                error = code === null ? "ENGINE_EXIT" : `ENGINE_EXIT_${code}`
                dictation.changed()
                dictation.emit(
                  "error",
                  { code: "ENGINE_EXIT", detail: detail || (code === null ? "" : String(code)), available: [] },
                  target,
                )
              }
            },
          },
        )
      } catch (cause) {
        status = "error"
        error = "ENGINE_START_FAILED"
        dictation.changed()
        throw cause
      }
    },

    stop() {
      if (handle) {
        stopping = true
        handle.stop()
        reset()
      }
      status = "idle"
      error = ""
      locale = ""
      dictation.changed()
    },

    diagnose() {
      return diagnose()
    },
  })

  let talking: SpeakHandle | undefined

  const speech = ctx.provide(Speech, {
    speak(input) {
      talking?.stop()
      talking = speakSapi(input, (ok) => {
        talking = undefined
        speech.emit("done", { ok })
      })
    },

    stop() {
      if (talking) {
        talking.stop()
        talking = undefined
      }
      speech.emit("done", { ok: true })
    },

    voices() {
      return listSapiVoices()
    },
  })

  ctx.onCleanup(() => {
    if (handle) {
      stopping = true
      handle.stop()
      reset()
    }
    talking?.stop()
    talking = undefined
  })
}