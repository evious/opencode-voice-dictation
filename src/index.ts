import { Plugin } from "@opencode/plugin"
import { listEdgeVoices, synthesizeEdge } from "./edge.js"
import { VoiceRpc } from "./rpc.js"
import { WhisperEngine } from "./whisper/server.js"
import { installWhisperCpp, WhisperCppEngine, installFfmpeg } from "./whispercpp/server.js"

/**
 * Server part of the plugin.
 *
 * It registers the Edge TTS, WhisperX and whisper.cpp RPCs. Running them here
 * (instead of in the Electron main process) lets their dependencies resolve
 * from the plugin's own node_modules.
 */
export default Plugin.define({
  id: "voice-dictation",
  async setup(ctx) {
    const whisper = new WhisperEngine()
    const whisperCpp = new WhisperCppEngine()

    await ctx.rpc.register(VoiceRpc, {
      capabilities: async () => ({
        platform: process.platform,
        engines:
          process.platform === "linux"
            ? ["whispercpp"]
            : process.platform === "win32"
              ? ["windows", "system", "whisper"]
              : [],
      }),
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
      whisperCppInstall: async (input) => {
        const { model } = input as { model: string }
        return installWhisperCpp(model)
      },
      whisperCppStatus: async (input) => {
        const { model } = input as { model: string }
        return whisperCpp.status(model)
      },
      whisperCppInstallFfmpeg: async () => installFfmpeg(),
      whisperCppTranscribe: async (input) => {
        return whisperCpp.transcribe(input as {
          audio: string
          mime: string
          language: string
          model: string
        })
      },
    })

    return () => {
      whisper.stop()
      whisperCpp.stop()
    }
  },
})

