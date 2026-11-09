import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

/**
 * Bridge between the window setup and the Electron main process.
 *
 * The engine lives in `main` because it needs `node:child_process`; the window
 * only paints status and inserts the transcript.
 */
export const Dictation = Ipc.define({
  id: "voice-dictation.dictation",
  state: Schema.Struct({
    status: Schema.Literals(["idle", "starting", "listening", "error"]),
    error: Schema.String,
    locale: Schema.String,
  }),
  methods: {
    start: {
      input: Schema.Struct({
        locale: Schema.String,
        minConfidence: Schema.Number,
      }),
    },
    stop: {},
    diagnose: {
      output: Schema.Struct({
        locales: Schema.Array(Schema.String),
        microphone: Schema.Boolean,
        selected: Schema.String,
        error: Schema.String,
      }),
    },
  },
  events: {
    final: Schema.Struct({
      text: Schema.String,
      confidence: Schema.Number,
    }),
    error: Schema.Struct({
      code: Schema.String,
      detail: Schema.String,
      available: Schema.Array(Schema.String),
    }),
  },
})

export interface DiagnoseResult {
  locales: string[]
  microphone: boolean
  selected: string
  error: string
}

/**
 * Text-to-speech bridge. The window speaks with `speechSynthesis` when the
 * Electron build exposes voices, and falls back to this main-process engine
 * (`System.Speech.Synthesis`) when it does not.
 */export const Speech = Ipc.define({
  id: "voice-dictation.speech",
  methods: {
    speak: {
      input: Schema.Struct({
        text: Schema.String,
        rate: Schema.Number,
        voice: Schema.String,
      }),
    },
    stop: {},
    voices: {
      output: Schema.Array(Schema.String),
    },
  },
  events: {
    done: Schema.Struct({ ok: Schema.Boolean }),
  },
})

/**
 * Windows 11 voice typing. The window focuses the composer and asks main to
 * press Win+H; Windows writes the text straight into the focused field.
 */
export const VoiceTyping = Ipc.define({
  id: "voice-dictation.voice-typing",
  methods: {
    toggle: {},
  },
})
