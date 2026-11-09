import type { Plugin } from "@opencode/plugin"

/**
 * Server part of the plugin.
 *
 * It does nothing on its own: it exists so the desktop app assigns the plugin
 * the id `voice-dictation` (used for commands, settings pages and the Ipc
 * contract) and so the GUI part is loaded from the global `opencode.json`.
 *
 * `@opencode/plugin` is a type-only import on purpose: the server loads this
 * file directly, and a runtime import would make the plugin depend on a
 * `node_modules` tree next to it.
 */
const plugin: Plugin.Plugin = {
  id: "voice-dictation",
  setup() {},
}

export default plugin
