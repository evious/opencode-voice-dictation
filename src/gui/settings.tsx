import { createSignal, onMount, Show } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { Dictation, VoiceTyping } from "./contract"
import type { definition } from "./definition"
import type { Speaker } from "./speak"
import { VoiceRpc } from "../rpc"

const FALLBACK_LOCALES = [
  "es-ES",
  "es-MX",
  "es-AR",
  "es-CO",
  "pt-BR",
  "pt-PT",
  "en-US",
  "en-GB",
  "fr-FR",
  "de-DE",
  "it-IT",
]

/**
 * Settings page. It only reads and writes the declared store; the engine is
 * asked for installed languages when the page mounts.
 */
export function VoiceSettings(props: { speaker: Speaker }) {
  const ctx = usePlugin<typeof definition>()
  const ui = ctx.ui
  const prefs = ctx.stores.prefs
  const speechPrefs = ctx.stores.speech
  const ttsPrefs = ctx.stores.tts
  const enginePrefs = ctx.stores.engine
  const whisperPrefs = ctx.stores.whisper
  const dictation = ctx.main(Dictation)
  const voiceTyping = ctx.main(VoiceTyping)

  const [locales, setLocales] = createSignal<readonly string[]>([])
  const [busy, setBusy] = createSignal(false)
  const [whisperBusy, setWhisperBusy] = createSignal(false)

  onMount(() => {
    props.speaker.setConfig({ engine: ttsPrefs.value.engine, voice: ttsPrefs.value.voice })
    void dictation
      .diagnose()
      .then((result) => {
        if (result.locales.length > 0) setLocales(result.locales)
      })
      .catch(() => {})
    void props.speaker.refreshVoices()
  })

  const localeOptions = () => {
    const list = locales()
    const current = prefs.value.locale
    const merged = list.includes(current) ? list : [current, ...list]
    return merged.map((value) => ({ value, label: value }))
  }

  const voiceOptions = () => {
    const list = props.speaker.voices().map((voice) => ({ value: voice.id, label: voice.label }))
    if (ttsPrefs.value.engine === "edge") return list
    return [{ value: "", label: ctx.t("speech.voice.auto") }, ...list]
  }

  const voiceValue = () =>
    ttsPrefs.value.engine === "edge" ? ttsPrefs.value.voice : speechPrefs.value.voiceURI

  const selectVoice = (value: string) => {
    if (ttsPrefs.value.engine === "edge") {
      ttsPrefs.update((draft) => {
        draft.voice = value
      })
      props.speaker.setConfig({ voice: value })
      return
    }
    patchSpeech({ voiceURI: value })
  }

  const patch = (change: { locale?: string; minConfidence?: number; trailingSpace?: boolean; autoFocus?: boolean }) => {
    prefs.update((draft) => {
      if (change.locale !== undefined) draft.locale = change.locale
      if (change.minConfidence !== undefined) draft.minConfidence = change.minConfidence
      if (change.trailingSpace !== undefined) draft.trailingSpace = change.trailingSpace
      if (change.autoFocus !== undefined) draft.autoFocus = change.autoFocus
    })
  }

  const patchSpeech = (change: { voiceURI?: string; rate?: number; skipCode?: boolean }) => {
    speechPrefs.update((draft) => {
      if (change.voiceURI !== undefined) draft.voiceURI = change.voiceURI
      if (change.rate !== undefined) draft.rate = change.rate
      if (change.skipCode !== undefined) draft.skipCode = change.skipCode
    })
  }

  const patchEngine = (mode: string) => {
    enginePrefs.update((draft) => {
      draft.mode = mode
    })
  }

  const patchWhisper = (change: { python?: string; model?: string; language?: string }) => {
    whisperPrefs.update((draft) => {
      if (change.python !== undefined) draft.python = change.python
      if (change.model !== undefined) draft.model = change.model
      if (change.language !== undefined) draft.language = change.language
    })
  }

  const testWhisper = async () => {
    setWhisperBusy(true)
    try {
      const status = (await ctx.client.rpc(VoiceRpc).whisperStatus({
        python: whisperPrefs.value.python,
        model: whisperPrefs.value.model,
      })) as { ready: boolean; model: string; device: string; error: string }

      if (status.ready) {
        ctx.toast.show({
          variant: "success",
          title: ctx.t("pill.title"),
          description: ctx.t("whisper.test.ready", { model: status.model, device: status.device }),
        })
      } else {
        ctx.toast.show({
          variant: "error",
          title: ctx.t("pill.title"),
          description: ctx.t("whisper.test.error", { error: status.error || "?" }),
        })
      }
    } catch (cause) {
      ctx.toast.show({
        variant: "error",
        title: ctx.t("pill.title"),
        description: ctx.t("whisper.test.error", {
          error: cause instanceof Error ? cause.message : String(cause),
        }),
      })
    } finally {
      setWhisperBusy(false)
    }
  }

  const patchTts = (engine: string) => {
    ttsPrefs.update((draft) => {
      draft.engine = engine
    })
    props.speaker.setConfig({ engine })
    void props.speaker.refreshVoices()
  }

  const testWinH = async () => {
    try {
      await voiceTyping.toggle()
      ctx.toast.show({
        variant: "default",
        title: ctx.t("settings.winh"),
        description: ctx.t("settings.winh.sent"),
      })
    } catch (cause) {
      ctx.toast.show({
        variant: "error",
        title: ctx.t("pill.title"),
        description: cause instanceof Error ? cause.message : ctx.t("error.winh"),
      })
    }
  }

  const preview = async () => {
    try {
      await props.speaker.preview()
    } catch (cause) {
      ctx.toast.show({
        variant: "error",
        title: ctx.t("read.title"),
        description: cause instanceof Error ? cause.message : ctx.t("read.error"),
      })
    }
  }

  const test = async () => {
    setBusy(true)
    try {
      const result = await dictation.diagnose()

      if (result.locales.length === 0) {
        ctx.toast.show({
          variant: "error",
          title: ctx.t("error.title"),
          description: ctx.t("settings.test.failed", { reason: ctx.t("common.reason.no-recognizers") }),
          persistent: true,
        })
        return
      }

      if (!result.microphone) {
        ctx.toast.show({
          variant: "error",
          title: ctx.t("error.title"),
          description: ctx.t("settings.test.failed", { reason: ctx.t("common.reason.no-microphone") }),
          persistent: true,
        })
        return
      }

      if (result.locales.length > 0 && !locales().length) setLocales(result.locales)

      ctx.toast.show({
        variant: "success",
        title: ctx.t("error.title"),
        description: ctx.t("settings.test.success", { locale: result.selected || result.locales[0] || prefs.value.locale }),
      })
    } catch (cause) {
      ctx.toast.show({
        variant: "error",
        title: ctx.t("error.title"),
        description: cause instanceof Error ? cause.message : String(cause),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ui.SettingsLayout title={ctx.t("settings.title")} description={ctx.t("settings.description")}>
      <ui.SettingsSection title={ctx.t("settings.section")}>
        <ui.SettingsRow
          id="engine"
          title={ctx.t("settings.engine")}
          description={ctx.t("settings.engine.description")}
        >
          <ui.Select
            label={ctx.t("settings.engine")}
            value={enginePrefs.value.mode}
            options={[
              { value: "windows", label: ctx.t("engine.windows") },
              { value: "system", label: ctx.t("engine.system") },
              { value: "whisper", label: ctx.t("engine.whisper") },
            ]}
            onChange={(value) => patchEngine(value)}
          />
        </ui.SettingsRow>

        <Show when={enginePrefs.value.mode === "windows"}>
          <ui.SettingsRow
            id="winh"
            title={ctx.t("settings.winh")}
            description={ctx.t("settings.winh.description")}
          >
            <ui.Button onClick={() => void testWinH()}>{ctx.t("settings.winh.run")}</ui.Button>
          </ui.SettingsRow>
        </Show>

        <Show when={enginePrefs.value.mode === "whisper"}>
          <ui.SettingsRow
            id="whisper-python"
            title={ctx.t("whisper.python")}
            description={ctx.t("whisper.python.description")}
          >
            <ui.TextInput
              label={ctx.t("whisper.python")}
              value={whisperPrefs.value.python}
              onInput={(value) => patchWhisper({ python: value })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow
            id="whisper-model"
            title={ctx.t("whisper.model")}
            description={ctx.t("whisper.model.description")}
          >
            <ui.Select
              label={ctx.t("whisper.model")}
              value={whisperPrefs.value.model}
              options={[
                { value: "large-v3-turbo", label: "large-v3-turbo" },
                { value: "large-v3", label: "large-v3" },
                { value: "medium", label: "medium" },
              ]}
              onChange={(value) => patchWhisper({ model: value })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow
            id="whisper-language"
            title={ctx.t("whisper.language")}
            description={ctx.t("whisper.language.description")}
          >
            <ui.Select
              label={ctx.t("whisper.language")}
              value={whisperPrefs.value.language}
              options={[
                { value: "", label: ctx.t("whisper.language.auto") },
                { value: "es", label: "Español" },
                { value: "en", label: "English" },
                { value: "pt", label: "Português" },
              ]}
              onChange={(value) => patchWhisper({ language: value })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow
            id="whisper-test"
            title={ctx.t("whisper.test")}
            description={ctx.t("whisper.test.description")}
          >
            <ui.Button busy={whisperBusy()} onClick={() => void testWhisper()}>
              {ctx.t("whisper.test.run")}
            </ui.Button>
          </ui.SettingsRow>
        </Show>

        <Show when={enginePrefs.value.mode === "system"}>
          <ui.SettingsRow
            id="language"
            title={ctx.t("settings.language")}
            description={ctx.t("settings.language.description")}
          >
            <ui.Select
              label={ctx.t("settings.language")}
              value={prefs.value.locale}
              options={localeOptions().length > 0 ? localeOptions() : FALLBACK_LOCALES.map((value) => ({ value, label: value }))}
              onChange={(value) => patch({ locale: value })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow
            id="confidence"
            title={ctx.t("settings.confidence")}
            description={ctx.t("settings.confidence.description")}
          >
            <ui.Select
              label={ctx.t("settings.confidence")}
              value={String(prefs.value.minConfidence)}
              options={[
                { value: "0.2", label: ctx.t("confidence.low") },
                { value: "0.4", label: ctx.t("confidence.normal") },
                { value: "0.6", label: ctx.t("confidence.high") },
              ]}
              onChange={(value) => patch({ minConfidence: Number(value) || 0.4 })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow id="space" title={ctx.t("settings.space")} description={ctx.t("settings.space.description")}>
            <ui.Switch
              label={ctx.t("settings.space")}
              hideLabel
              checked={prefs.value.trailingSpace}
              onChange={(checked) => patch({ trailingSpace: checked })}
            />
          </ui.SettingsRow>

          <ui.SettingsRow id="focus" title={ctx.t("settings.focus")} description={ctx.t("settings.focus.description")}>
            <ui.Switch
              label={ctx.t("settings.focus")}
              hideLabel
              checked={prefs.value.autoFocus}
              onChange={(checked) => patch({ autoFocus: checked })}
            />
          </ui.SettingsRow>
        </Show>
      </ui.SettingsSection>

      <ui.SettingsSection title={ctx.t("speech.section")}>
        <ui.SettingsRow
          id="tts-engine"
          title={ctx.t("speech.engine")}
          description={ctx.t("speech.engine.description")}
        >
          <ui.Select
            label={ctx.t("speech.engine")}
            value={ttsPrefs.value.engine}
            options={[
              { value: "edge", label: ctx.t("speech.engine.edge") },
              { value: "system", label: ctx.t("speech.engine.system") },
            ]}
            onChange={(value) => patchTts(value)}
          />
        </ui.SettingsRow>

        <ui.SettingsRow
          id="voice"
          title={ctx.t("speech.voice")}
          description={ctx.t("speech.voice.description")}
        >
          <ui.Select
            label={ctx.t("speech.voice")}
            value={voiceValue()}
            options={voiceOptions()}
            onChange={(value) => selectVoice(value)}
          />
        </ui.SettingsRow>

        <Show when={props.speaker.error()}>
          <ui.SettingsRow
            id="tts-error"
            title={ctx.t("speech.edge.error")}
            description={props.speaker.error()}
          />
        </Show>

        <ui.SettingsRow
          id="rate"
          title={ctx.t("speech.rate")}
          description={ctx.t("speech.rate.description")}
        >
          <ui.Select
            label={ctx.t("speech.rate")}
            value={String(speechPrefs.value.rate)}
            options={[
              { value: "0.8", label: ctx.t("speech.rate.slow") },
              { value: "1", label: ctx.t("speech.rate.normal") },
              { value: "1.2", label: ctx.t("speech.rate.fast") },
              { value: "1.5", label: ctx.t("speech.rate.faster") },
            ]}
            onChange={(value) => patchSpeech({ rate: Number(value) || 1 })}
          />
        </ui.SettingsRow>

        <ui.SettingsRow
          id="skip-code"
          title={ctx.t("speech.skipCode")}
          description={ctx.t("speech.skipCode.description")}
        >
          <ui.Switch
            label={ctx.t("speech.skipCode")}
            hideLabel
            checked={speechPrefs.value.skipCode}
            onChange={(checked) => patchSpeech({ skipCode: checked })}
          />
        </ui.SettingsRow>

        <ui.SettingsRow
          id="preview"
          title={ctx.t("speech.preview")}
          description={ctx.t("speech.preview.description")}
        >
          <ui.Button onClick={() => void preview()}>{ctx.t("read.idle")}</ui.Button>
        </ui.SettingsRow>
      </ui.SettingsSection>

      <ui.SettingsSection title={ctx.t("settings.test.section")}>
        <ui.SettingsRow id="test" title={ctx.t("settings.test")} description={ctx.t("settings.test.description")}>
          <ui.Button busy={busy()} onClick={() => void test()}>
            {ctx.t("settings.test.run")}
          </ui.Button>
        </ui.SettingsRow>
      </ui.SettingsSection>
    </ui.SettingsLayout>
  )
}
