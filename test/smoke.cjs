#!/usr/bin/env node
/** Scenario tests for dist/gui-experimental.cjs with a fake host and powershell.exe. */
const { mkdirSync, writeFileSync, chmodSync } = require("node:fs")
const { join } = require("node:path")
const { tmpdir } = require("node:os")

const fakeDir = join(tmpdir(), "fake-pwsh")
mkdirSync(fakeDir, { recursive: true })
const fake = join(fakeDir, "powershell.exe")

const scripts = {
  ok: `#!/bin/sh
case "$*" in *-Diagnose*) echo '{"type":"diagnose","locales":["es-ES","en-US"],"microphone":true,"selected":"es-ES","error":""}'; exit 0;; esac
echo '{"type":"ready","locale":"es-ES","requested":"es-ES"}'
sleep 0.05
echo '{"type":"final","text":"hola mundo","confidence":0.92,"locale":"es-ES"}'
sleep 10
`,
  error: `#!/bin/sh
case "$*" in *-Diagnose*) echo '{"type":"diagnose","locales":["en-US"],"microphone":true,"selected":"en-US","error":""}'; exit 0;; esac
echo '{"type":"error","code":"LANGUAGE_NOT_AVAILABLE","detail":"es-ES","available":["en-US"]}'
exit 4
`,
  late: `#!/bin/sh
case "$*" in *-Diagnose*) echo '{"type":"diagnose","locales":[],"microphone":false,"selected":"","error":"NO_RECOGNIZERS"}'; exit 0;; esac
echo '{"type":"ready","locale":"es-ES","requested":"es-ES"}'
sleep 0.6
echo '{"type":"final","text":"tarde","confidence":0.9,"locale":"es-ES"}'
sleep 10
`,
}

function use(mode) {
  writeFileSync(fake, scripts[mode], "utf8")
  chmodSync(fake, 0o755)
}

process.env.PATH = `${fakeDir}:${process.env.PATH}`

// Web Speech API stub. The bundle reads these lazily, so each test can reset them.
const speech = { spoken: [], cancelled: 0, paused: 0, resumed: 0, autoEnd: true, voices: [] }

const audioState = { instances: [], autoEnd: false }

function installAudio(options = {}) {
  audioState.instances = []
  audioState.autoEnd = options.autoEnd ?? false

  globalThis.Audio = class {
    constructor(src) {
      this.src = src
      this.paused = false
      audioState.instances.push(this)
    }

    play() {
      this.paused = false
      if (audioState.autoEnd) setTimeout(() => this.onended?.(), 0)
      return Promise.resolve()
    }

    pause() {
      this.paused = true
    }
  }
}

function installWebSpeech(options = {}) {
  speech.spoken = []
  speech.cancelled = 0
  speech.paused = 0
  speech.resumed = 0
  speech.autoEnd = options.autoEnd ?? true
  speech.voices = options.voices ?? [{ name: "Test Voice", lang: "es-ES", voiceURI: "test-voice" }]

  globalThis.speechSynthesis = {
    getVoices: () => speech.voices,
    speak: (utterance) => {
      speech.spoken.push(utterance.text)
      if (speech.autoEnd) setTimeout(() => utterance.onend?.(), 0)
    },
    cancel: () => {
      speech.cancelled++
    },
    pause: () => {
      speech.paused++
    },
    resume: () => {
      speech.resumed++
    },
    addEventListener: () => {},
  }
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text
    }
  }
}

function uninstallWebSpeech() {
  speech.spoken = []
  speech.cancelled = 0
  speech.paused = 0
  speech.resumed = 0
  speech.voices = []
  globalThis.speechSynthesis = {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {
      speech.cancelled++
    },
    pause: () => {
      speech.paused++
    },
    resume: () => {
      speech.resumed++
    },
    addEventListener: () => {},
  }
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text
    }
  }
}

const Module = require("node:module")
const originalLoad = Module._load
const fakeGui = {
  Plugin: { define: (value) => value },
  Ipc: { define: (value) => value },
  Store: { global: (_schema, initial) => ({ value: initial }) },
  Command: "Command",
  ComposerPill: "ComposerPill",
  SettingsPage: "SettingsPage",
  usePlugin: () => {
    throw new Error("usePlugin needs a real host")
  },
}
Module._load = function (request, ...rest) {
  if (request === "@opencode/plugin/gui" || request === "@opencode/plugin/gui/main") return fakeGui
  if (request === "@opencode/plugin/rpc" || request === "@opencode/schema/rpc") {
    return { Rpc: { define: (value) => value } }
  }
  return originalLoad.call(this, request, ...rest)
}

installWebSpeech()

const def = require(join(__dirname, "..", "dist", "gui-experimental.cjs")).default
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function host(options = {}) {
  const listeners = {}
  const speechListeners = {}
  const state = {
    provider: undefined,
    speech: undefined,
    changed: 0,
    voiceTypingCalls: 0,
    speechStopCalls: 0,
    edgeCalls: [],
  }
  const inserted = []
  const toasts = []
  const spokenFallback = []
  let currentKey = "session-a"

  const composer = {
    text: () => options.text ?? "Explica",
    insert: (text) => inserted.push(text),
    focus: () => (state.focused = true),
  }

  const providerApi = {
    changed: () => state.changed++,
    emit: (name, data) => (listeners[name] ?? []).forEach((fn) => fn(data)),
    dispose() {},
  }

  const dictationClient = {
    start: async (input) => state.provider.start(input, { window: 1, signal: new AbortController().signal }),
    stop: async () => state.provider.stop(),
    diagnose: async () => state.provider.diagnose(),
    state: () => state.provider.state(1),
    on: (name, fn) => {
      ;(listeners[name] ??= []).push(fn)
      return () => {}
    },
  }

  const speechClient = {
    speak: async (input) => {
      spokenFallback.push(input)
      ;(speechListeners.done ?? []).forEach((fn) => fn({ ok: true }))
    },
    stop: async () => {
      state.speechStopCalls++
    },
    voices: async () => options.sapiVoices ?? [],
    on: (name, fn) => {
      ;(speechListeners[name] ??= []).push(fn)
      return () => {}
    },
  }

  const voiceTypingClient = {
    toggle: async () => {
      state.voiceTypingCalls++
    },
  }

  const rpcClient = {
    edgeVoices: async () =>
      options.edgeVoices ?? [
        { id: "es-ES-XimenaNeural", label: "es-ES · Ximena", locale: "es-ES", gender: "Female" },
        { id: "es-MX-DaliaNeural", label: "es-MX · Dalia", locale: "es-MX", gender: "Female" },
      ],
    edgeSpeak: async (input) => {
      state.edgeCalls.push(input)
      return options.edgeAudio ?? Buffer.from("fake-mp3").toString("base64")
    },
  }

  const messageClient = {
    message: {
      list: async () => options.messages ?? { data: [] },
    },
    rpc: () => rpcClient,
  }

  const added = []
  const windowCtx = {
    id: "voice-dictation",
    options: {},
    client: messageClient,
    app: { platform: "desktop" },
    signal: new AbortController().signal,
    add: (_registry, item) => {
      added.push(typeof item === "function" ? item() : item)
      return () => {}
    },
    provide: () => () => {},
    use: () => () => ({ status: "inactive" }),
    main: (token) => {
      if (token.id === "voice-dictation.speech") return speechClient
      if (token.id === "voice-dictation.voice-typing") return voiceTypingClient
      return dictationClient
    },
    t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
    plural: (key, count) => `${key} ${count}`,
    layout: { settings: () => {} },
    locale: { locale: () => "es-ES", direction: () => "ltr" },
    sessions: {
      current: () =>
        options.noSession ? undefined : { key: currentKey, id: "ses_test", server: { client: messageClient } },
    },
    screen: { current: () => (options.noSession ? undefined : { composer }) },
    stores: {
      prefs: {
        value: {
          locale: "es-ES",
          minConfidence: 0.4,
          trailingSpace: true,
          autoFocus: false,
          ...(options.prefs ?? {}),
        },
        ready: () => true,
        update: () => {},
        set: () => {},
      },
      speech: {
        value: { voiceURI: "", rate: 1, skipCode: true, ...(options.speech ?? {}) },
        ready: () => true,
        update: () => {},
        set: () => {},
      },
      engine: {
        value: { mode: options.engine ?? "system" },
        ready: () => true,
        update: () => {},
        set: () => {},
      },
      tts: {
        value: { engine: options.ttsEngine ?? "system", voice: options.ttsVoice ?? "es-ES-XimenaNeural" },
        ready: () => true,
        update: () => {},
        set: () => {},
      },
    },
    toast: { show: (entry) => toasts.push(entry) },
    onCleanup: () => {},
  }

  const mainCtx = {
    id: "voice-dictation",
    options: {},
    app: { platform: "desktop" },
    signal: new AbortController().signal,
    provide: (token, impl) => {
      if (token.id === "voice-dictation.speech") state.speech = impl
      else if (token.id === "voice-dictation.voice-typing") state.voiceTyping = impl
      else state.provider = impl
      return providerApi
    },
    onCleanup: () => {},
    storage: {},
    log: { write: () => {} },
  }

  def.main(mainCtx)
  def.setup(windowCtx)

  return {
    added,
    inserted,
    toasts,
    spokenFallback,
    state,
    dictationClient,
    switchSession: () => (currentKey = "session-b"),
    pill: () => added.find((item) => item && item.id === "dictate" && typeof item.show === "function"),
    readPill: () => added.find((item) => item && item.id === "read" && typeof item.show === "function"),
    command: () => added.find((item) => item && item.id === "toggle" && typeof item.run === "function"),
  }
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`FAIL - ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

const TEXT_WITH_CODE =
  "Hola **mundo**.\n\n```js\nconsole.log('no leer')\n```\n\nAdiós, [enlace](https://example.com)."

async function run() {
  await test("happy path inserts text with separator", async () => {
    use("ok")
    installWebSpeech()
    const h = host()
    const pill = h.pill()
    if (!pill) throw new Error("pill missing")
    if (!h.command()) throw new Error("command missing")
    if (pill.show({}).label !== "pill.idle") throw new Error("unexpected idle label")

    pill.show({}).run()
    await sleep(400)

    if (h.dictationClient.state().status !== "listening") {
      throw new Error(`state ${h.dictationClient.state().status}`)
    }
    if (h.inserted[0] !== " hola mundo") throw new Error(`inserted ${JSON.stringify(h.inserted)}`)
    if (pill.show({}).label !== "pill.listening") throw new Error("unexpected listening label")
    if (h.toasts.length) throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    h.command().run()
    await sleep(150)
    if (h.dictationClient.state().status !== "idle") throw new Error("not idle after stop")
  })

  await test("empty composer gets no leading space", async () => {
    use("ok")
    installWebSpeech()
    const h = host({ text: "" })
    h.pill().show({}).run()
    await sleep(400)
    if (h.inserted[0] !== "hola mundo") throw new Error(`inserted ${JSON.stringify(h.inserted)}`)
    h.command().run()
    await sleep(100)
  })

  await test("missing language surfaces a toast and error state", async () => {
    use("error")
    installWebSpeech()
    const h = host()
    h.pill().show({}).run()
    await sleep(400)
    if (h.dictationClient.state().status !== "error") {
      throw new Error(`state ${h.dictationClient.state().status}`)
    }
    if (!h.toasts.some((entry) => entry.variant === "error" && entry.description.includes("error.language"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    if (h.inserted.length) throw new Error("inserted on error")
    if (h.pill().show({}).label !== "pill.error") throw new Error("unexpected error label")
    h.command().run()
    await sleep(100)
  })

  await test("changing session discards the transcript", async () => {
    use("ok")
    installWebSpeech()
    const h = host()
    h.pill().show({}).run()
    h.switchSession()
    await sleep(400)
    if (h.inserted.length) throw new Error(`inserted ${JSON.stringify(h.inserted)}`)
    if (!h.toasts.some((entry) => entry.description.includes("toast.discarded"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    h.command().run()
    await sleep(100)
  })

  await test("stop before the first phrase inserts nothing", async () => {
    use("late")
    installWebSpeech()
    const h = host()
    h.pill().show({}).run()
    await sleep(150)
    h.command().run()
    await sleep(700)
    if (h.inserted.length) throw new Error(`inserted ${JSON.stringify(h.inserted)}`)
    if (h.dictationClient.state().status !== "idle") throw new Error("not idle")
  })

  await test("diagnose parses the engine report", async () => {
    use("ok")
    installWebSpeech()
    const h = host()
    const result = await h.dictationClient.diagnose()
    if (!result.microphone || result.locales.length !== 2) throw new Error(JSON.stringify(result))
  })

  await test("windows mode focuses the composer and toggles Win+H", async () => {
    use("ok")
    installWebSpeech()
    const h = host({ engine: "windows" })
    const pill = h.pill()
    if (!pill) throw new Error("pill missing")
    if (pill.show({}).label !== "pill.idle") throw new Error("unexpected idle label")

    pill.show({}).run()
    await sleep(50)

    if (h.state.voiceTypingCalls !== 1) throw new Error(`calls ${h.state.voiceTypingCalls}`)
    if (!h.state.focused) throw new Error("composer was not focused")
    if (h.dictationClient.state().status !== "idle") throw new Error("offline engine started")
    if (pill.show({}).label !== "pill.dictating") throw new Error(`label ${pill.show({}).label}`)

    pill.show({}).run()
    await sleep(50)

    if (h.state.voiceTypingCalls !== 2) throw new Error(`calls ${h.state.voiceTypingCalls}`)
    if (pill.show({}).label !== "pill.idle") throw new Error("did not return to idle")
  })

  await test("reads the last message without code or markdown", async () => {
    use("ok")
    installWebSpeech()
    const h = host({ messages: { data: [{ type: "assistant", content: [{ type: "text", text: TEXT_WITH_CODE }] }] } })
    const pill = h.readPill()
    if (!pill) throw new Error("read pill missing")
    if (pill.show({}).label !== "read.idle") throw new Error("unexpected read label")

    pill.show({}).run()
    await sleep(100)

    const text = speech.spoken.join(" ")
    if (!text.includes("Hola mundo")) throw new Error(`spoken: ${JSON.stringify(speech.spoken)}`)
    if (!text.includes("Adiós")) throw new Error(`spoken: ${JSON.stringify(speech.spoken)}`)
    if (text.includes("console")) throw new Error(`code was read: ${JSON.stringify(speech.spoken)}`)
    if (text.includes("example.com")) throw new Error(`url was read: ${JSON.stringify(speech.spoken)}`)
    if (pill.show({}).label !== "read.idle") throw new Error("still marked as reading")
    if (h.state.speechStopCalls !== 0) throw new Error(`unexpected speech.stop calls: ${h.state.speechStopCalls}`)
  })

  await test("the reading menu stops the speech", async () => {
    use("ok")
    installWebSpeech({ autoEnd: false })
    const h = host({ messages: { data: [{ type: "assistant", content: [{ type: "text", text: "Una frase larga." }] }] } })
    const pill = h.readPill()
    pill.show({}).run()
    await sleep(50)
    const view = pill.show({})
    if (view.label !== "read.speaking") throw new Error("not marked as reading")
    const stop = (view.rows ?? []).find((row) => row.id === "stop")
    if (!stop) throw new Error("stop row missing")
    stop.run()
    if (pill.show({}).label !== "read.idle") throw new Error("did not stop")
    if (!speech.cancelled) throw new Error("speechSynthesis.cancel not called")
  })

  await test("pause, resume and read again from the menu", async () => {
    use("ok")
    installWebSpeech({ autoEnd: false })
    const h = host({ messages: { data: [{ type: "assistant", content: [{ type: "text", text: "Una frase larga para leer." }] }] } })
    const pill = h.readPill()

    pill.show({}).run()
    await sleep(50)

    let view = pill.show({})
    const pause = (view.rows ?? []).find((row) => row.id === "pause")
    if (!pause) throw new Error("pause row missing")
    pause.run()
    if (speech.paused !== 1) throw new Error(`paused ${speech.paused}`)
    if (pill.show({}).label !== "read.paused") throw new Error("not marked as paused")

    view = pill.show({})
    const resume = (view.rows ?? []).find((row) => row.id === "pause")
    if (!resume || resume.label !== "read.resume") throw new Error("resume row missing")
    resume.run()
    if (speech.resumed !== 1) throw new Error(`resumed ${speech.resumed}`)
    if (pill.show({}).label !== "read.speaking") throw new Error("not speaking after resume")

    const before = speech.spoken.length
    view = pill.show({})
    const restart = (view.rows ?? []).find((row) => row.id === "restart")
    if (!restart) throw new Error("restart row missing")
    restart.run()
    await sleep(50)
    if (speech.spoken.length <= before) throw new Error("did not read again")
    if (pill.show({}).label !== "read.speaking") throw new Error("not speaking after restart")

    view = pill.show({})
    const stop = (view.rows ?? []).find((row) => row.id === "stop")
    stop.run()
    if (pill.show({}).label !== "read.idle") throw new Error("did not stop")
  })

  await test("edge engine synthesizes and plays with pause and stop", async () => {
    use("ok")
    installWebSpeech()
    installAudio({ autoEnd: false })
    const h = host({
      ttsEngine: "edge",
      messages: { data: [{ type: "assistant", content: [{ type: "text", text: "Hola desde Edge." }] }] },
    })
    const pill = h.readPill()

    pill.show({}).run()
    await sleep(100)

    if (h.state.edgeCalls.length !== 1) throw new Error(`edge calls: ${h.state.edgeCalls.length}`)
    if (h.state.edgeCalls[0].text !== "Hola desde Edge.") throw new Error(`text: ${h.state.edgeCalls[0].text}`)
    if (audioState.instances.length !== 1) throw new Error(`audio instances: ${audioState.instances.length}`)
    if (pill.show({}).label !== "read.speaking") throw new Error(`label: ${pill.show({}).label}`)

    const pause = (pill.show({}).rows ?? []).find((row) => row.id === "pause")
    if (!pause) throw new Error("pause row missing")
    pause.run()
    if (!audioState.instances[0].paused) throw new Error("audio not paused")
    if (pill.show({}).label !== "read.paused") throw new Error("not marked as paused")

    const resume = (pill.show({}).rows ?? []).find((row) => row.id === "pause")
    resume.run()
    if (audioState.instances[0].paused) throw new Error("audio not resumed")

    const stop = (pill.show({}).rows ?? []).find((row) => row.id === "stop")
    stop.run()
    if (pill.show({}).label !== "read.idle") throw new Error("not stopped")
  })

  await test("no session explains why nothing is read", async () => {
    use("ok")
    installWebSpeech()
    const h = host({ noSession: true })
    h.readPill().show({}).run()
    await sleep(50)
    if (!h.toasts.some((entry) => entry.description.includes("read.noSession"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    if (speech.spoken.length) throw new Error("spoke without a session")
  })

  await test("a code-only message is reported as empty", async () => {
    use("ok")
    installWebSpeech()
    const h = host({
      messages: { data: [{ type: "assistant", content: [{ type: "text", text: "```js\nconsole.log(1)\n```" }] }] },
    })
    h.readPill().show({}).run()
    await sleep(100)
    if (!h.toasts.some((entry) => entry.description.includes("read.empty"))) {
      throw new Error(`toasts ${JSON.stringify(h.toasts)}`)
    }
    if (speech.spoken.length) throw new Error("spoke code")
  })

  await test("falls back to SAPI when the window has no voices", async () => {
    use("ok")
    uninstallWebSpeech()
    const h = host({
      sapiVoices: ["Microsoft Helena"],
      messages: { data: [{ type: "assistant", content: [{ type: "text", text: "Texto de respaldo." }] }] },
    })
    h.readPill().show({}).run()
    await sleep(100)
    if (h.spokenFallback.length !== 1) throw new Error(`fallback calls: ${JSON.stringify(h.spokenFallback)}`)
    if (!h.spokenFallback[0].text.includes("Texto de respaldo")) {
      throw new Error(`fallback text: ${JSON.stringify(h.spokenFallback[0])}`)
    }
    if (h.readPill().show({}).label !== "read.idle") throw new Error("still marked as reading")
  })

  process.exit(process.exitCode ?? 0)
}

run()
