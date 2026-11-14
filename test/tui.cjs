#!/usr/bin/env node
const { readFileSync } = require("node:fs")
const { join } = require("node:path")
const ts = require("typescript")

Object.defineProperty(process, "platform", { value: "win32", configurable: true })

const root = join(__dirname, "..")

function loadTs(file, requireFn = require) {
  const source = readFileSync(file, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  new Function("exports", "module", "require", output)(module.exports, module, requireFn)
  return module.exports
}

const speechText = loadTs(join(root, "src", "speech-text.ts"))

const state = {
  dictateCalls: 0,
  edgeCalls: [],
  listCalls: [],
  playerCalls: [],
  sapiCalls: [],
  playerMode: "ok",
  pendingResolve: undefined,
}

function reset() {
  state.dictateCalls = 0
  state.edgeCalls = []
  state.listCalls = []
  state.playerCalls = []
  state.sapiCalls = []
  state.playerMode = "ok"
  state.pendingResolve = undefined
}

const mocks = {
  "@opencode/plugin/tui": { Plugin: { define: (value) => value } },
  "./rpc.js": { VoiceRpc: { id: "test.voice" } },
  "./speech-text.js": speechText,
  "./sapi-speech.js": {
    speakSapi(input, onDone) {
      const call = { ...input, stopped: false }
      state.sapiCalls.push(call)
      setImmediate(() => onDone(true))
      return {
        stop() {
          call.stopped = true
        },
      }
    },
  },
  "./tui/player.js": {
    playMp3Base64(base64) {
      const call = { base64, stopped: false }
      state.playerCalls.push(call)

      let resolveDone
      const done = new Promise((resolve) => {
        resolveDone = resolve
      })

      if (state.playerMode === "ok") resolveDone(true)
      else if (state.playerMode === "fail") resolveDone(false)
      else state.pendingResolve = resolveDone

      return {
        done,
        stop() {
          call.stopped = true
          resolveDone(false)
        },
      }
    },
  },
  "./tui/insert.js": {
    insertIntoPrompt: async () => ({ ok: false, method: "none", message: "" }),
  },
  "./tui/linux/dictation.js": {
    async startLinuxRecording() {
      throw new Error("Linux recorder is not used on win32")
    },
  },
  "./tui/linux/playback.js": {
    async playMp3Base64() {
      return { stop() {}, done: Promise.resolve(false) }
    },
    speakLinux(_text, _rate, onDone) {
      setImmediate(() => onDone(false))
      return { stop() {} }
    },
  },
  "./win-h.js": {
    async sendVoiceTypingShortcut() {
      state.dictateCalls++
    },
  },
}

function requireMock(name) {
  if (name in mocks) return mocks[name]
  throw new Error(`unexpected require: ${name}`)
}

const definition = loadTs(join(root, "src", "tui.ts"), requireMock).default

function makeContext(options = {}) {
  const toasts = []
  const layers = []
  let route = { type: "session", sessionID: "ses_test" }
  let messages = { data: [], cursor: {} }

  const client = {
    message: {
      list: async (input) => {
        state.listCalls.push(input)
        return messages
      },
    },
    rpc: () => ({
      edgeSpeak: async (input) => {
        state.edgeCalls.push(input)
        return "YXVkaW8="
      },
    }),
  }

  const context = {
    options,
    ui: {
      toast: { show: (toast) => toasts.push(toast) },
      router: { current: () => route },
      dialog: {
        select: async () => undefined,
        confirm: async () => true,
        alert: async () => {},
      },
    },
    client,
    storage: {
      store: (_key, { initial }) => {
        const value = { ...initial }
        return [value, async (mutation) => mutation(value)]
      },
    },
    keymap: {
      layer: (factory) => layers.push(factory()),
    },
  }

  return {
    context,
    toasts,
    layers,
    setRoute: (value) => {
      route = value
    },
    setMessages: (value) => {
      messages = value
    },
  }
}

function command(layers, suffix) {
  const layer = layers[0]
  const found = layer.commands.find((entry) => entry.id.endsWith(suffix))
  if (!found) throw new Error(`command ${suffix} missing`)
  return found
}

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms))

let failures = 0

async function test(name, fn) {
  reset()
  try {
    await fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`FAIL - ${name}: ${error.message}`)
    failures++
  }
}

async function run() {
  await test("registers dictation and read commands", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    const layer = h.layers[0]
    if (!layer) throw new Error("no keymap layer")
    if (layer.mode !== "global") throw new Error(`mode ${layer.mode}`)
    if (layer.bindings.length !== 3) throw new Error(`bindings ${layer.bindings.length}`)

    const dictate = command(h.layers, "dictate")
    const read = command(h.layers, "read")
    const pause = command(h.layers, "pause")
    const settings = command(h.layers, "settings")
    if (dictate.bind !== "<leader>d") throw new Error(`dictate bind ${dictate.bind}`)
    if (read.bind !== "<leader>v") throw new Error(`read bind ${read.bind}`)
    if (pause.bind !== "<leader>p") throw new Error(`pause bind ${pause.bind}`)
    if (dictate.slash.name !== "dictado") throw new Error(`dictate slash ${dictate.slash.name}`)
    if (read.slash.name !== "leer") throw new Error(`read slash ${read.slash.name}`)
    if (pause.slash.name !== "pausar") throw new Error(`pause slash ${pause.slash.name}`)
    if (settings.slash.name !== "ajustes-voz") throw new Error(`settings slash ${settings.slash.name}`)
    cleanup()
  })

  await test("dictation opens the Windows shortcut", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    await command(h.layers, "dictate").run()
    if (state.dictateCalls !== 1) throw new Error(`calls ${state.dictateCalls}`)
    if (h.toasts.at(-1)?.variant !== "info") throw new Error("missing info toast")
    cleanup()
  })

  await test("reading requires an open session", async () => {
    const h = makeContext()
    h.setRoute({ type: "home" })
    const cleanup = definition.setup(h.context)
    await command(h.layers, "read").run()
    if (state.listCalls.length !== 0) throw new Error("listed messages without a session")
    if (!h.toasts.some((toast) => toast.message.includes("Abre una sesión"))) {
      throw new Error("missing session toast")
    }
    cleanup()
  })

  await test("reads the last assistant text without code", async () => {
    const h = makeContext()
    h.setMessages({
      data: [
        {
          type: "assistant",
          content: [{ type: "text", text: "# Hola\n\n```js\nconst x = 1\n```\nMundo" }],
        },
      ],
      cursor: {},
    })
    const cleanup = definition.setup(h.context)
    await command(h.layers, "read").run()

    if (state.listCalls.length !== 1) throw new Error(`list calls ${state.listCalls.length}`)
    if (state.edgeCalls.length !== 1) throw new Error(`edge calls ${state.edgeCalls.length}`)
    if (state.edgeCalls[0].text.includes("const x")) throw new Error("code was not removed")
    if (!state.edgeCalls[0].text.includes("Hola")) throw new Error("text missing")
    if (state.playerCalls.length !== 1) throw new Error("player not called")
    if (state.playerCalls[0].base64 !== "YXVkaW8=") throw new Error("audio not forwarded")
    cleanup()
  })

  await test("reading again stops active playback", async () => {
    const h = makeContext()
    h.setMessages({
      data: [{ type: "assistant", content: [{ type: "text", text: "Una frase larga." }] }],
      cursor: {},
    })
    state.playerMode = "pending"
    const cleanup = definition.setup(h.context)
    const first = command(h.layers, "read").run()
    await tick()

    if (state.playerCalls.length !== 1) throw new Error("playback did not start")
    await command(h.layers, "read").run()

    if (!state.playerCalls[0].stopped) throw new Error("playback was not stopped")
    if (!h.toasts.some((toast) => toast.message.includes("Lectura detenida"))) {
      throw new Error("missing stop toast")
    }
    state.pendingResolve?.(false)
    await first
    cleanup()
  })

  await test("falls back to the system voice when Edge playback fails", async () => {
    const h = makeContext()
    h.setMessages({
      data: [{ type: "assistant", content: [{ type: "text", text: "Texto de respaldo." }] }],
      cursor: {},
    })
    state.playerMode = "fail"
    const cleanup = definition.setup(h.context)
    await command(h.layers, "read").run()

    if (state.sapiCalls.length !== 1) throw new Error(`sapi calls ${state.sapiCalls.length}`)
    if (!state.sapiCalls[0].text.includes("Texto de respaldo")) throw new Error("wrong fallback text")
    if (!h.toasts.some((toast) => toast.variant === "warning" && toast.message.includes("voz del sistema"))) {
      throw new Error("missing fallback toast")
    }
    cleanup()
  })

  await test("cleanup stops active playback", async () => {
    const h = makeContext()
    h.setMessages({
      data: [{ type: "assistant", content: [{ type: "text", text: "Otra frase." }] }],
      cursor: {},
    })
    state.playerMode = "pending"
    const cleanup = definition.setup(h.context)
    const first = command(h.layers, "read").run()
    await tick()

    cleanup()
    if (!state.playerCalls[0].stopped) throw new Error("playback was not stopped")
    state.pendingResolve?.(false)
    await first
  })

  if (failures > 0) process.exit(1)
}

run()
