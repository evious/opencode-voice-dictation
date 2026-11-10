import { Plugin } from "@opencode/plugin"
import { listEdgeVoices, synthesizeEdge } from "./edge.js"
import { VoiceRpc } from "./rpc.js"
import { WhisperEngine } from "./whisper/server.js"

/**
 * Server part of the plugin.
 *
 * It registers the Edge TTS and Whisper RPCs. Running them here (instead of
 * in the Electron main process) lets their dependencies resolve from the
 * plugin's own node_modules.
 */
export default Plugin.define({
  id: "voice-dictation",
  async setup(ctx) {
    const whisper = new WhisperEngine()

    await ctx.rpc.register(VoiceRpc, {
      edgeVoices: async () => listEdgeVoices(),
      edgeSpeak: async (input) => {
        const { text, voice, rate } = input as { text: string; voice: string; rate: number }
        return synthesizeEdge({ text, voice, rate })
      },
      whisperTranscribe: async (input) => {
        return whisper.transcribe(input as {
          audio: string
          mime: string
          language: string
          python: string
          model: string
        })
      },
      whisperStatus: async (input) => {
        const { python, model } = input as { python: string; model: string }
        try {
          return await whisper.warm(python, model)
        } catch (cause) {
          return {
            ...whisper.statusOf(),
            ready: false,
            error: cause instanceof Error ? cause.message : String(cause),
          }
        }
      },
    })

    return () => whisper.stop()
  },
})

