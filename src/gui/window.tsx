import { createSignal } from "solid-js"
import { Command, ComposerPill, SettingsPage, type ComposerPillView, type Plugin } from "@opencode/plugin/gui"
import { Dictation, Speech, VoiceTyping } from "./contract"
import type { definition } from "./definition"
import { createSpeaker } from "./speak"
import { VoiceSettings } from "./settings"

/**
 * Window setup: the microphone pill above the composer, the keybind and the
 * `/dictado` slash command.
 */
export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const dictation = ctx.main(Dictation)
  const speech = ctx.main(Speech)
  const voiceTyping = ctx.main(VoiceTyping)
  const speaker = createSpeaker(ctx, speech)
  const prefs = ctx.stores.prefs
  const engine = ctx.stores.engine
  const [windowsActive, setWindowsActive] = createSignal(false)

  let targetSession: string | undefined

  const reason = (code: string, detail: string, available: readonly string[]) => {
    switch (code) {
      case "LANGUAGE_NOT_AVAILABLE":
        return ctx.t("error.language", {
          locale: detail || prefs.value.locale,
          available: available.length > 0 ? available.join(", ") : "—",
        })
      case "NO_RECOGNIZERS":
        return ctx.t("error.none")
      case "MICROPHONE_UNAVAILABLE":
        return ctx.t("error.mic")
      case "SYSTEM_SPEECH_UNAVAILABLE":
        return ctx.t("error.system")
      case "ENGINE_EXIT":
        return ctx.t("error.exit")
      default:
        return ctx.t("error.unknown", { code })
    }
  }

  const start = () => {
    if (windowsActive()) {
      setWindowsActive(false)
      void voiceTyping.toggle().catch(() => {})
    }
    speaker.cancel()
    targetSession = ctx.sessions.current()?.key
    void dictation
      .start({ locale: prefs.value.locale, minConfidence: prefs.value.minConfidence })
      .catch((cause: unknown) => {
        ctx.toast.show({
          variant: "error",
          title: ctx.t("error.title"),
          description: cause instanceof Error ? cause.message : String(cause),
        })
      })
  }

  const stop = () => {
    void dictation.stop().catch(() => {})
  }

  const toggleWindows = () => {
    speaker.cancel()
    ctx.screen.current()?.composer.focus()

    void voiceTyping
      .toggle()
      .then(() => setWindowsActive((value) => !value))
      .catch((cause: unknown) => {
        setWindowsActive(false)
        ctx.toast.show({
          variant: "error",
          title: ctx.t("pill.title"),
          description:
            cause instanceof Error ? `${ctx.t("error.winh")} ${cause.message}` : ctx.t("error.winh"),
        })
      })
  }

  const toggle = () => {
    if (engine.value.mode === "windows") {
      toggleWindows()
      return
    }

    const status = dictation.state()?.status ?? "idle"
    if (status === "starting" || status === "listening") stop()
    else start()
  }

  const read = () => {
    if (speaker.speaking()) {
      speaker.cancel()
      return
    }

    if (!ctx.sessions.current()) {
      ctx.toast.show({ variant: "error", title: ctx.t("read.title"), description: ctx.t("read.noSession") })
      return
    }

    const status = dictation.state()?.status ?? "idle"
    if (status === "starting" || status === "listening") void dictation.stop().catch(() => {})

    void (async () => {
      try {
        const text = await speaker.lastAssistantText()
        if (!text.trim()) {
          ctx.toast.show({ variant: "default", title: ctx.t("read.title"), description: ctx.t("read.empty") })
          return
        }
        const started = await speaker.speak(text)
        if (!started) {
          ctx.toast.show({ variant: "default", title: ctx.t("read.title"), description: ctx.t("read.empty") })
        }
      } catch (cause) {
        ctx.toast.show({
          variant: "error",
          title: ctx.t("read.title"),
          description: cause instanceof Error ? cause.message : ctx.t("read.error"),
        })
      }
    })()
  }

  dictation.on("final", (data) => {
    const current = ctx.sessions.current()?.key

    if (targetSession && current && current !== targetSession) {
      ctx.toast.show({ variant: "error", title: ctx.t("error.title"), description: ctx.t("toast.discarded") })
      return
    }

    const composer = ctx.screen.current()?.composer
    if (!composer) return

    const existing = composer.text()
    const separator = prefs.value.trailingSpace && existing.length > 0 && !/\s$/.test(existing) ? " " : ""
    composer.insert(separator + data.text)

    if (prefs.value.autoFocus) composer.focus()
  })

  dictation.on("error", (data) => {
    ctx.toast.show({
      variant: "error",
      title: ctx.t("error.title"),
      description: reason(data.code, data.detail, data.available),
      persistent: data.code === "LANGUAGE_NOT_AVAILABLE" || data.code === "NO_RECOGNIZERS",
      duration: 8000,
    })
  })

  const view = (): ComposerPillView | undefined => {
    if (ctx.app.platform !== "desktop") return undefined

    if (engine.value.mode === "windows") {
      return windowsActive()
        ? {
            label: ctx.t("pill.dictating"),
            icon: "outline-wave-audio",
            tone: "danger",
            title: ctx.t("pill.stop"),
            run: toggle,
          }
        : {
            label: ctx.t("pill.idle"),
            icon: "outline-wave-audio",
            title: ctx.t("pill.winH"),
            run: toggle,
          }
    }

    const status = dictation.state()?.status ?? "idle"

    if (status === "starting") {
      return { label: ctx.t("pill.starting"), icon: "outline-wave-audio", title: ctx.t("pill.title"), run: toggle }
    }

    if (status === "listening") {
      return {
        label: ctx.t("pill.listening"),
        icon: "outline-wave-audio",
        tone: "danger",
        title: ctx.t("pill.stop"),
        run: toggle,
      }
    }

    if (status === "error") {
      return {
        label: ctx.t("pill.error"),
        icon: "outline-wave-audio",
        tone: "warning",
        title: ctx.t("pill.title"),
        run: toggle,
      }
    }

    return { label: ctx.t("pill.idle"), icon: "outline-wave-audio", title: ctx.t("pill.title"), run: toggle }
  }

  ctx.add(ComposerPill, () => ({ id: "dictate", show: () => view() }))

  ctx.add(ComposerPill, () => ({
    id: "read",
    order: 1,
    show: () => {
      if (ctx.app.platform !== "desktop") return undefined

      return speaker.speaking()
        ? {
            label: ctx.t("read.speaking"),
            icon: "outline-audio",
            tone: "success",
            title: ctx.t("read.stop"),
            run: read,
          }
        : {
            label: ctx.t("read.idle"),
            icon: "outline-audio",
            title: ctx.t("read.title"),
            run: read,
          }
    },
  }))

  ctx.add(Command, (): Command => ({
    id: "toggle",
    title: ctx.t("command.toggle"),
    description: ctx.t("command.toggle.description"),
    keywords: "voice dictation microphone speech dictado voz microfono",
    group: ctx.t("pill.title"),
    section: "prompt",
    bind: "mod+shift+m",
    slash: { name: "dictado" },
    editable: true,
    enabled: ctx.app.platform === "desktop",
    run: toggle,
  }))

  ctx.add(Command, (): Command => ({
    id: "configure",
    title: ctx.t("command.configure"),
    keywords: "voice dictation microphone speech dictado voz microfono",
    group: ctx.t("pill.title"),
    enabled: ctx.app.platform === "desktop",
    run: () => ctx.layout.settings(ctx.id),
  }))

  ctx.add(Command, (): Command => ({
    id: "read",
    title: ctx.t("command.read"),
    description: ctx.t("command.read.description"),
    keywords: "read aloud speech voice leer voz altavoz lectura",
    group: ctx.t("pill.title"),
    section: "prompt",
    bind: "mod+shift+l",
    slash: { name: "leer" },
    editable: true,
    enabled: ctx.app.platform === "desktop",
    run: read,
  }))

  ctx.add(SettingsPage, {
    id: ctx.id,
    icon: "outline-audio",
    get title() {
      return ctx.t("settings.title")
    },
    get entries() {
      return [
        { id: "engine", title: ctx.t("settings.engine"), keywords: "engine motor dictation dictado winh voz" },
        { id: "winh", title: ctx.t("settings.winh"), keywords: "winh windows voice typing dictado" },
        { id: "language", title: ctx.t("settings.language"), keywords: "voice language idioma voz" },
        { id: "confidence", title: ctx.t("settings.confidence"), keywords: "voice confidence confianza" },
        { id: "test", title: ctx.t("settings.test"), keywords: "voice microphone microphone test microfono" },
        { id: "voice", title: ctx.t("speech.voice"), keywords: "read aloud voice voz lectura altavoz" },
        { id: "rate", title: ctx.t("speech.rate"), keywords: "read aloud speed velocidad lectura" },
        { id: "skip-code", title: ctx.t("speech.skipCode"), keywords: "read aloud code codigo lectura" },
        { id: "preview", title: ctx.t("speech.preview"), keywords: "read aloud test voice probar voz" },
      ]
    },
    render: () => <VoiceSettings speaker={speaker} />,
  })
}
