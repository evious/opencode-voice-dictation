import { createSignal } from "solid-js"
import type { IpcClient, SetupContext } from "@opencode/plugin/gui"
import { Speech } from "./contract"
import type { definition } from "./definition"

export interface VoiceOption {
  id: string
  label: string
}

export interface Speaker {
  speaking(): boolean
  backend(): "web" | "sapi" | "none"
  voices(): VoiceOption[]
  refreshVoices(): Promise<void>
  lastAssistantText(): Promise<string>
  speak(text: string): Promise<boolean>
  cancel(): void
  preview(): Promise<boolean>
}

const MAX_CHUNK = 250

/** Turns Markdown into something worth hearing. */
export function cleanForSpeech(text: string, skipCode: boolean): string {
  let value = text.replace(/\r\n/g, "\n")

  if (skipCode) {
    value = value.replace(/```[\s\S]*?```/g, " ")
  } else {
    value = value.replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
  }

  value = value.replace(/`([^`]+)`/g, "$1")
  value = value.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  value = value.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  value = value.replace(/^\s*#{1,6}\s+/gm, "")
  value = value.replace(/^\s*>\s?/gm, "")
  value = value.replace(/^\s*[-*+]\s+/gm, "")
  value = value.replace(/^\s*\d+\.\s+/gm, "")
  value = value.replace(/(\*\*|__)(.*?)\1/g, "$2")
  value = value.replace(/(\*|_)(.*?)\1/g, "$2")
  value = value.replace(/^\s*\|.*\|\s*$/gm, " ")
  value = value.replace(/\n{2,}/g, ". ")
  value = value.replace(/\n/g, " ")
  value = value.replace(/\s+/g, " ")
  value = value.replace(/\s+([.,;:!?])/g, "$1")
  value = value.replace(/([.,;:!?]){2,}/g, "$1")

  return value.trim()
}

/** Splits at sentence boundaries, then at word boundaries for long sentences. */
export function chunkForSpeech(text: string, max = MAX_CHUNK): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const sentences = trimmed.split(/(?<=[.!?…])\s+/)
  const chunks: string[] = []
  let current = ""

  const pushWords = (sentence: string) => {
    let part = ""
    for (const word of sentence.split(/\s+/)) {
      if (!word) continue
      if (part && part.length + 1 + word.length > max) {
        chunks.push(part)
        part = word
      } else {
        part = part ? `${part} ${word}` : word
      }
    }
    return part
  }

  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current) {
        chunks.push(current)
        current = ""
      }
      current = pushWords(sentence)
      continue
    }

    if (current && current.length + 1 + sentence.length > max) {
      chunks.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }

  if (current) chunks.push(current)
  return chunks
}

export function createSpeaker(
  ctx: SetupContext<typeof definition>,
  speech: IpcClient<typeof Speech.spec>,
): Speaker {
  const prefs = ctx.stores.speech

  const [speaking, setSpeaking] = createSignal(false)
  const [voices, setVoices] = createSignal<VoiceOption[]>([])
  const [backend, setBackend] = createSignal<"web" | "sapi" | "none">("none")

  let generation = 0
  let queue: string[] = []

  const synth = () =>
    typeof globalThis.speechSynthesis !== "undefined" ? globalThis.speechSynthesis : undefined

  const pickVoice = () => {
    const available = synth()?.getVoices() ?? []
    if (available.length === 0) return undefined

    const wanted = prefs.value.voiceURI
    if (wanted) {
      const chosen = available.find((voice) => voice.voiceURI === wanted)
      if (chosen) return chosen
    }

    const base = ctx.locale.locale().split("-")[0]?.toLowerCase() ?? "es"
    return available.find((voice) => voice.lang.toLowerCase().startsWith(base)) ?? available[0]
  }

  const refreshVoices = async () => {
    const available = synth()?.getVoices() ?? []

    if (available.length > 0) {
      setVoices(
        available.map((voice) => ({
          id: voice.voiceURI,
          label: `${voice.name} — ${voice.lang}`,
        })),
      )
      setBackend("web")
      return
    }

    try {
      const names = await speech.voices()
      if (names.length > 0) {
        setVoices(names.map((name) => ({ id: name, label: name })))
        setBackend("sapi")
        return
      }
    } catch {
      // Main is unreachable or PowerShell failed; treat as no voices.
    }

    setBackend("none")
  }

  const cancel = () => {
    generation++
    queue = []
    synth()?.cancel()
    setSpeaking(false)
    void speech.stop().catch(() => {})
  }

  const speak = async (text: string) => {
    const cleaned = cleanForSpeech(text, prefs.value.skipCode)
    if (!cleaned) return false

    cancel()
    await refreshVoices()

    if (backend() === "web") {
      const engine = synth()
      if (!engine) return false

      const voice = pickVoice()
      const rate = prefs.value.rate
      const gen = generation
      queue = chunkForSpeech(cleaned)
      setSpeaking(true)

      const pump = () => {
        if (gen !== generation) return
        const next = queue.shift()
        if (!next) {
          setSpeaking(false)
          return
        }

        const utterance = new SpeechSynthesisUtterance(next)
        if (voice) utterance.voice = voice
        if (voice?.lang) utterance.lang = voice.lang
        utterance.rate = rate
        utterance.onend = pump
        utterance.onerror = pump
        engine.speak(utterance)
      }

      pump()
      return true
    }

    if (backend() === "sapi") {
      setSpeaking(true)
      try {
        await speech.speak({
          text: cleaned,
          rate: prefs.value.rate,
          voice: prefs.value.voiceURI,
        })
      } catch (cause) {
        setSpeaking(false)
        throw cause
      }
      return true
    }

    setSpeaking(false)
    throw new Error(ctx.t("read.noVoices"))
  }

  const lastAssistantText = async () => {
    const session = ctx.sessions.current()
    if (!session) return ""

    // The session may live on another server than the one that runs the plugin
    // (the desktop app can show WSL and Windows servers side by side), so ask
    // the session's own server instead of `ctx.client`.
    const page = await session.server.client.message.list({
      sessionID: session.id,
      type: "assistant",
      order: "desc",
      limit: 1,
    })

    const message = page.data[0]
    if (!message || message.type !== "assistant") return ""

    return message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
  }

  speech.on("done", () => setSpeaking(false))

  const engine = synth()
  engine?.addEventListener?.("voiceschanged", () => void refreshVoices())
  void refreshVoices()

  return {
    speaking,
    backend,
    voices,
    refreshVoices,
    lastAssistantText,
    speak,
    cancel,
    preview: () => speak(ctx.t("speech.preview.text")),
  }
}
