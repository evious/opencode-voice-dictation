#!/usr/bin/env node
const { readFileSync } = require("node:fs")
const { join } = require("node:path")
const ts = require("typescript")

Object.defineProperty(process, "platform", { value: "linux", configurable: true })

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
const insertModule = loadTs(join(root, "src", "tui", "insert.ts"))
const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms))

const state = {
  capabilities: { platform: "linux", engines: ["whispercpp"] },
  status: {
    installed: true,
    ready: false,
    model: "base-q5_1",
    error: "",
    ffmpeg: true,
    ffmpegVersion: "ffmpeg version test",
    ffmpegPath: "ffmpeg",
  },
  transcript: { text: "hola linux", language: "es" },
  transcribeError: undefined,
  edgeError: undefined,
  insertResult: { ok: true, method: "append", message: "" },
  confirmResult: true,
  recordMode: "ok",
  playerMode: "ok",
  speakMode: "ok",
  pendingResolve: undefined,
  capabilitiesCalls: 0,
  statusCalls: 0,
  installCalls: [],
  ffmpegInstallCalls: 0,
  confirmCalls: 0,
  recordStarts: [],
  recordStops: 0,
  recordCancels: 0,
  transcribeCalls: [],
  insertCalls: [],
  edgeCalls: [],
  listCalls: [],
  playerCalls: [],
  speakCalls: [],
  storageSettings: undefined,
  selectQueue: [],
  selectCalls: [],
  alerts: [],
  voiceCalls: 0,
  statusModes: [],
  statusDisposed: false,
  voices: [
    { id: "es-ES-XimenaNeural", label: "es-ES · Ximena" },
    { id: "es-MX-DaliaNeural", label: "es-MX · Dalia" },
  ],
}

function reset() {
  state.capabilities = { platform: "linux", engines: ["whispercpp"] }
  state.status = {
    installed: true,
    ready: false,
    model: "base-q5_1",
    error: "",
    ffmpeg: true,
    ffmpegVersion: "ffmpeg version test",
    ffmpegPath: "ffmpeg",
  }
  state.transcript = { text: "hola linux", language: "es" }
  state.transcribeError = undefined
  state.edgeError = undefined
  state.insertResult = { ok: true, method: "append", message: "" }
  state.confirmResult = true
  state.recordMode = "ok"
  state.playerMode = "ok"
  state.speakMode = "ok"
  state.pendingResolve = undefined
  state.capabilitiesCalls = 0
  state.statusCalls = 0
  state.installCalls = []
  state.ffmpegInstallCalls = 0
  state.confirmCalls = 0
  state.recordStarts = []
  state.recordStops = 0
  state.recordCancels = 0
  state.transcribeCalls = []
  state.insertCalls = []
  state.edgeCalls = []
  state.listCalls = []
  state.playerCalls = []
  state.speakCalls = []
  state.storageSettings = undefined
  state.selectQueue = []
  state.selectCalls = []
  state.alerts = []
  state.voiceCalls = 0
  state.statusModes = []
  state.statusDisposed = false
  state.voices = [
    { id: "es-ES-XimenaNeural", label: "es-ES · Ximena" },
    { id: "es-MX-DaliaNeural", label: "es-MX · Dalia" },
  ]
}

const mocks = {
  "@opencode/plugin/tui": { Plugin: { define: (value) => value } },
  "node:os": require("node:os"),
  "node:path": require("node:path"),
  "./rpc.js": { VoiceRpc: { id: "test.voice" } },
  "./speech-text.js": speechText,
  "./sapi-speech.js": {
    speakSapi(_input, onDone) {
      setImmediate(() => onDone(false))
      return { stop() {} }
    },
  },
  "./win-h.js": {
    async sendVoiceTypingShortcut() {},
  },
  "./tui/player.js": {
    playMp3Base64() {
      return { stop() {}, done: Promise.resolve(false) }
    },
  },
  "./tui/insert.js": {
    async insertIntoPrompt(_context, text, options) {
      state.insertCalls.push({ text, options })
      return state.insertResult
    },
  },
  "./tui/status.js": {
    createStatusController: () => ({
      setMode(mode) {
        state.statusModes.push(mode)
      },
      dispose() {
        state.statusDisposed = true
      },
    }),
  },
  "./tui/linux/dictation.js": {
    async startLinuxRecording(options) {
      state.recordStarts.push(options)
      return {
        async stop() {
          state.recordStops++
          if (state.recordMode === "fail") throw new Error("no microphone")
          return { audio: "YXVkaW8=", mime: "audio/wav" }
        },
        cancel() {
          state.recordCancels++
        },
      }
    },
  },
  "./tui/linux/playback.js": {
    async playMp3Base64(base64) {
      const call = { base64, stopped: false, paused: 0, resumed: 0 }
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
        pause() {
          call.paused++
        },
        resume() {
          call.resumed++
        },
      }
    },
    speakLinux(text, rate, onDone) {
      const call = { text, rate, stopped: false, paused: 0, resumed: 0 }
      state.speakCalls.push(call)

      if (state.speakMode === "ok") setImmediate(() => onDone(true))
      else setImmediate(() => onDone(false))

      return {
        stop() {
          call.stopped = true
        },
        pause() {
          call.paused++
        },
        resume() {
          call.resumed++
        },
      }
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

  const rpc = {
    capabilities: async () => {
      state.capabilitiesCalls++
      return state.capabilities
    },
    whisperCppStatus: async () => {
      state.statusCalls++
      return state.status
    },
    whisperCppInstall: async (input) => {
      state.installCalls.push(input)
      if (state.status) state.status = { ...state.status, installed: true }
      return { ok: true, model: input.model, error: "" }
    },
    whisperCppInstallFfmpeg: async () => {
      state.ffmpegInstallCalls++
      state.status = { ...state.status, ffmpeg: true }
      return { ok: true, error: "", command: "" }
    },
    whisperCppTranscribe: async (input) => {
      state.transcribeCalls.push(input)
      if (state.transcribeError) throw state.transcribeError
      return state.transcript
    },
    edgeSpeak: async (input) => {
      state.edgeCalls.push(input)
      if (state.edgeError) throw state.edgeError
      return "YXVkaW8="
    },
    edgeVoices: async () => {
      state.voiceCalls++
      return state.voices
    },
  }

  const client = {
    message: {
      list: async (input) => {
        state.listCalls.push(input)
        return messages
      },
    },
    rpc: () => rpc,
  }

  const context = {
    options,
    ui: {
      toast: { show: (toast) => toasts.push(toast) },
      router: { current: () => route },
      dialog: {
        select: async (input) => {
          state.selectCalls.push(input)
          return state.selectQueue.shift()
        },
        confirm: async () => {
          state.confirmCalls++
          return state.confirmResult
        },
        alert: async (input) => {
          state.alerts.push(input)
        },
      },
    },
    client,
    storage: {
      store: (_key, { initial }) => {
        state.storageSettings = { ...initial }
        return [state.storageSettings, async (mutation) => mutation(state.storageSettings)]
      },
    },
    keymap: { layer: (factory) => layers.push(factory()) },
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

function assistantMessage(text) {
  return {
    data: [{ type: "assistant", content: [{ type: "text", text }] }],
    cursor: {},
  }
}

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
  await test("registers dictation, read and pause commands", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    const layer = h.layers[0]
    if (!layer) throw new Error("no keymap layer")
    if (layer.bindings.length !== 3) throw new Error(`bindings ${layer.bindings.length}`)

    const dictate = command(h.layers, "dictate")
    const read = command(h.layers, "read")
    const pause = command(h.layers, "pause")
    if (dictate.bind !== "<leader>d") throw new Error(`dictate bind ${dictate.bind}`)
    if (read.bind !== "<leader>v") throw new Error(`read bind ${read.bind}`)
    if (pause.bind !== "<leader>p") throw new Error(`pause bind ${pause.bind}`)
    if (dictate.slash.name !== "dictado") throw new Error("dictate slash")
    if (read.slash.name !== "leer") throw new Error("read slash")
    if (pause.slash.name !== "pausar") throw new Error("pause slash")
    cleanup()
  })

  await test("records, transcribes and inserts in Linux", async () => {
    const h = makeContext({ model: "small-q5_1", language: "es", maxSeconds: 30 })
    const cleanup = definition.setup(h.context)
    const dictate = command(h.layers, "dictate")

    await dictate.run()
    if (state.recordStarts.length !== 1) throw new Error(`recording starts ${state.recordStarts.length}`)
    if (state.recordStarts[0].maxSeconds !== 30) throw new Error(`maxSeconds ${state.recordStarts[0].maxSeconds}`)
    if (!h.toasts.some((toast) => toast.message.includes("Grabando"))) throw new Error("missing recording toast")

    await dictate.run()
    if (state.recordStops !== 1) throw new Error(`record stops ${state.recordStops}`)
    if (state.transcribeCalls.length !== 1) throw new Error(`transcribe calls ${state.transcribeCalls.length}`)

    const call = state.transcribeCalls[0]
    if (call.model !== "small-q5_1") throw new Error(`model ${call.model}`)
    if (call.language !== "es") throw new Error(`language ${call.language}`)
    if (call.mime !== "audio/wav") throw new Error(`mime ${call.mime}`)
    if (call.audio !== "YXVkaW8=") throw new Error("audio not forwarded")
    if (state.insertCalls.length !== 1) throw new Error(`insert calls ${state.insertCalls.length}`)
    if (state.insertCalls[0].text !== "hola linux") throw new Error(`inserted ${state.insertCalls[0].text}`)
    if (!state.statusModes.includes("recording")) throw new Error(`modes ${JSON.stringify(state.statusModes)}`)
    if (!state.statusModes.includes("transcribing")) throw new Error(`modes ${JSON.stringify(state.statusModes)}`)
    if (!state.statusModes.includes("idle")) throw new Error(`modes ${JSON.stringify(state.statusModes)}`)
    cleanup()
  })

  await test("multi-line dictation hints about full paste", async () => {
    const h = makeContext()
    state.transcript = { text: "linea uno\nlinea dos", language: "es" }
    const cleanup = definition.setup(h.context)
    const dictate = command(h.layers, "dictate")

    await dictate.run()
    await dictate.run()

    if (!h.toasts.some((toast) => toast.message.includes("prompt.paste") && toast.message.includes("full"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    cleanup()
  })

  await test("an empty transcript does not insert anything", async () => {
    const h = makeContext()
    state.transcript = { text: "   ", language: "es" }
    const cleanup = definition.setup(h.context)
    const dictate = command(h.layers, "dictate")

    await dictate.run()
    await dictate.run()

    if (state.insertCalls.length !== 0) throw new Error("inserted empty transcript")
    if (!h.toasts.some((toast) => toast.message.includes("No se entendió"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    cleanup()
  })

  await test("cancelling the whisper.cpp install does not start recording", async () => {
    const h = makeContext()
    state.status = { ...state.status, installed: false }
    state.confirmResult = false
    const cleanup = definition.setup(h.context)
    const dictate = command(h.layers, "dictate")

    await dictate.run()

    if (state.recordStarts.length !== 0) throw new Error("recording started without engine")
    if (state.confirmCalls !== 1) throw new Error(`confirm calls ${state.confirmCalls}`)
    if (!h.toasts.some((toast) => toast.message.includes("falta whisper.cpp"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    cleanup()
  })

  await test("installs a missing ffmpeg and then records", async () => {
    const h = makeContext()
    state.status = { ...state.status, ffmpeg: false }
    const cleanup = definition.setup(h.context)
    const dictate = command(h.layers, "dictate")

    await dictate.run()

    if (state.ffmpegInstallCalls !== 1) throw new Error(`ffmpeg installs ${state.ffmpegInstallCalls}`)
    if (state.recordStarts.length !== 1) throw new Error("recording did not start after ffmpeg install")
    cleanup()
  })

  await test("reads the last assistant message on Linux", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("# Hola\n\n```js\nconst x = 1\n```\nMundo"))
    const cleanup = definition.setup(h.context)

    await command(h.layers, "read").run()

    if (state.edgeCalls.length !== 1) throw new Error(`edge calls ${state.edgeCalls.length}`)
    if (state.edgeCalls[0].text.includes("const x")) throw new Error("code was not removed")
    if (state.playerCalls.length !== 1) throw new Error("player not called")
    cleanup()
  })

  await test("reading again stops Linux playback", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("Una frase larga."))
    state.playerMode = "pending"
    const cleanup = definition.setup(h.context)
    const read = command(h.layers, "read")

    const first = read.run()
    await tick()
    await read.run()

    if (!state.playerCalls[0].stopped) throw new Error("playback was not stopped")
    if (!h.toasts.some((toast) => toast.message.includes("Lectura detenida"))) {
      throw new Error("missing stop toast")
    }
    state.pendingResolve?.(false)
    await first
    cleanup()
  })

  await test("pauses and resumes Linux playback", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("Una frase larga."))
    state.playerMode = "pending"
    const cleanup = definition.setup(h.context)
    const read = command(h.layers, "read")
    const pause = command(h.layers, "pause")

    const first = read.run()
    await tick()

    pause.run()
    if (state.playerCalls[0].paused !== 1) throw new Error("playback did not pause")
    pause.run()
    if (state.playerCalls[0].resumed !== 1) throw new Error("playback did not resume")
    if (!state.statusModes.includes("reading")) throw new Error(`modes ${JSON.stringify(state.statusModes)}`)
    if (!state.statusModes.includes("paused")) throw new Error(`modes ${JSON.stringify(state.statusModes)}`)

    state.pendingResolve?.(false)
    await first
    cleanup()
  })

  await test("falls back to Linux TTS when Edge playback fails", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("Texto de respaldo."))
    state.playerMode = "fail"
    const cleanup = definition.setup(h.context)

    await command(h.layers, "read").run()

    if (state.speakCalls.length !== 1) throw new Error(`speak calls ${state.speakCalls.length}`)
    if (!state.speakCalls[0].text.includes("Texto de respaldo")) throw new Error("wrong fallback text")
    if (!h.toasts.some((toast) => toast.variant === "warning" && toast.message.includes("voz del sistema"))) {
      throw new Error("missing fallback toast")
    }
    cleanup()
  })

  await test("engine system skips Edge and uses local TTS", async () => {
    const h = makeContext({ engine: "system" })
    h.setMessages(assistantMessage("Solo sistema."))
    const cleanup = definition.setup(h.context)

    await command(h.layers, "read").run()

    if (state.edgeCalls.length !== 0) throw new Error(`edge calls ${state.edgeCalls.length}`)
    if (state.speakCalls.length !== 1) throw new Error(`speak calls ${state.speakCalls.length}`)
    cleanup()
  })

  await test("dictating stops active reading", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("Una frase larga."))
    state.playerMode = "pending"
    const cleanup = definition.setup(h.context)
    const read = command(h.layers, "read")
    const dictate = command(h.layers, "dictate")

    const first = read.run()
    await tick()
    await dictate.run()

    if (!state.playerCalls[0].stopped) throw new Error("reading was not stopped")
    if (state.recordStarts.length !== 1) throw new Error("recording did not start")
    state.pendingResolve?.(false)
    await first
    cleanup()
  })

  await test("reading cancels an active recording", async () => {
    const h = makeContext()
    h.setMessages(assistantMessage("Texto."))
    const cleanup = definition.setup(h.context)

    await command(h.layers, "dictate").run()
    await command(h.layers, "read").run()

    if (state.recordCancels !== 1) throw new Error(`record cancels ${state.recordCancels}`)
    if (state.playerCalls.length !== 1) throw new Error("reading did not start")
    cleanup()
  })

  await test("settings menu changes the whisper.cpp model", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    state.selectQueue = ["model", "small-q5_1", "done"]

    await command(h.layers, "settings").run()

    if (state.storageSettings.model !== "small-q5_1") {
      throw new Error(`model ${state.storageSettings.model}`)
    }
    if (!state.selectCalls[0].options.some((option) => option.value === "model")) {
      throw new Error("model option missing")
    }
    cleanup()
  })

  await test("settings menu changes engine, voice, rate and skipCode", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    state.confirmResult = false
    state.selectQueue = ["engine", "system", "voice", "es-MX-DaliaNeural", "rate", "1.2", "skipCode", "done"]

    await command(h.layers, "settings").run()

    if (state.storageSettings.engine !== "system") throw new Error(`engine ${state.storageSettings.engine}`)
    if (state.storageSettings.voice !== "es-MX-DaliaNeural") throw new Error(`voice ${state.storageSettings.voice}`)
    if (state.storageSettings.rate !== 1.2) throw new Error(`rate ${state.storageSettings.rate}`)
    if (state.storageSettings.skipCode !== false) throw new Error(`skipCode ${state.storageSettings.skipCode}`)
    if (state.voiceCalls !== 1) throw new Error(`voice calls ${state.voiceCalls}`)
    cleanup()
  })

  await test("settings menu resets to opencode.jsonc values", async () => {
    const h = makeContext({ model: "small-q5_1" })
    const cleanup = definition.setup(h.context)
    state.selectQueue = ["model", "base-q5_1", "reset", "done"]

    await command(h.layers, "settings").run()

    if (state.storageSettings.model !== "small-q5_1") {
      throw new Error(`reset model ${state.storageSettings.model}`)
    }
    cleanup()
  })

  await test("settings menu reports whisper.cpp and ffmpeg status", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    state.selectQueue = ["status", "done"]

    await command(h.layers, "settings").run()

    if (state.alerts.length !== 1) throw new Error(`alerts ${state.alerts.length}`)
    if (!state.alerts[0].message.includes("ffmpeg")) throw new Error("status missing ffmpeg")
    cleanup()
  })

  await test("settings menu explains full paste", async () => {
    const h = makeContext()
    const cleanup = definition.setup(h.context)
    state.selectQueue = ["paste", "done"]

    await command(h.layers, "settings").run()

    if (state.alerts.length !== 1) throw new Error(`alerts ${state.alerts.length}`)
    const message = state.alerts[0].message
    if (!message.includes('"paste": "full"') || !message.includes("cli.json")) {
      throw new Error(`message ${message}`)
    }
    cleanup()
  })

  await test("insert uses appendPrompt when the runtime exposes it", async () => {
    let appended = ""
    const result = await insertModule.insertIntoPrompt(
      {
        client: {
          tui: {
            appendPrompt: async ({ body }) => {
              appended = body.text
              return true
            },
          },
        },
      },
      "hola desde la TUI",
    )

    if (!result.ok || result.method !== "append") throw new Error(`result ${JSON.stringify(result)}`)
    if (appended !== "hola desde la TUI") throw new Error(`appended ${appended}`)
  })

  await test("insert mode append fails cleanly without the API", async () => {
    const result = await insertModule.insertIntoPrompt({ client: {} }, "hola", { mode: "append" })
    if (result.ok || result.method !== "none") throw new Error(`result ${JSON.stringify(result)}`)
  })

  await test("WSL clipboard command preserves UTF-8 via base64", async () => {
    const text = "¿Qué puedes decirme sobre el proyecto?"
    const command = insertModule.wslClipboardCommand(text)
    if (command.includes("Console::In")) throw new Error("still uses Console::In")

    const match = command.match(/FromBase64String\('([^']+)'\)/)
    if (!match) throw new Error(`base64 not found: ${command}`)
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    if (decoded !== text) throw new Error(`decoded ${decoded}`)
  })

  if (failures > 0) process.exit(1)
}

run()
