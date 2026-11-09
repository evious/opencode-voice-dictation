import { Plugin } from "@opencode/plugin"
import { listEdgeVoices, synthesizeEdge } from "./edge.js"
import { VoiceRpc } from "./rpc.js"

/**
 * Server part of the plugin.
 *
 * It registers the Edge TTS RPC. Running it here (instead of in the Electron
 * main process) lets `msedge-tts` resolve from the plugin's own node_modules.
 */
export default Plugin.define({
  id: "voice-dictation",
  async setup(ctx) {
    await ctx.rpc.register(VoiceRpc, {
      edgeVoices: async () => listEdgeVoices(),
      edgeSpeak: async (input) => {
        const { text, voice, rate } = input as { text: string; voice: string; rate: number }
        return synthesizeEdge({ text, voice, rate })
      },
    })
  },
})
