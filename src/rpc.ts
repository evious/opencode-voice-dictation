import type { Rpc } from "@opencode/plugin"

/**
 * Edge TTS runs in the OpenCode server, where the plugin's own `node_modules`
 * resolves. The GUI only calls these methods and plays the returned MP3.
 *
 * The definition is a plain object (Rpc.define is the identity function), so
 * the GUI bundle does not need to load the RPC module at runtime.
 */
export const VoiceRpc = {
  id: "voice-dictation.voice",
  methods: {
    edgeVoices: {
      input: { type: "object", additionalProperties: false },
      output: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            locale: { type: "string" },
            gender: { type: "string" },
          },
          required: ["id", "label", "locale", "gender"],
          additionalProperties: false,
        },
      },
    },
    edgeSpeak: {
      input: {
        type: "object",
        properties: {
          text: { type: "string" },
          voice: { type: "string" },
          rate: { type: "number" },
        },
        required: ["text", "voice", "rate"],
        additionalProperties: false,
      },
      output: { type: "string" },
    },
    whisperTranscribe: {
      input: {
        type: "object",
        properties: {
          audio: { type: "string" },
          mime: { type: "string" },
          language: { type: "string" },
          python: { type: "string" },
          model: { type: "string" },
        },
        required: ["audio", "mime", "language", "python", "model"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          text: { type: "string" },
          language: { type: "string" },
        },
        required: ["text", "language"],
        additionalProperties: false,
      },
    },
    whisperStatus: {
      input: {
        type: "object",
        properties: {
          python: { type: "string" },
          model: { type: "string" },
        },
        required: ["python", "model"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          ready: { type: "boolean" },
          model: { type: "string" },
          device: { type: "string" },
          error: { type: "string" },
        },
        required: ["ready", "model", "device", "error"],
        additionalProperties: false,
      },
    },
  },
  events: {},
} as const satisfies Rpc.PortableDefinition
