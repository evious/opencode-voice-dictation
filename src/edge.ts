import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

export interface EdgeVoiceInfo {
  id: string
  label: string
  locale: string
  gender: string
}

interface RawVoice {
  ShortName: string
  FriendlyName: string
  Locale: string
  Gender: string
}

function shortName(voice: RawVoice): string {
  const friendly = voice.FriendlyName.replace(/^Microsoft\s+/i, "")
    .replace(/\s+Online.*$/i, "")
    .replace(/\s*-\s*Spanish.*$/i, "")
    .trim()

  if (friendly && friendly !== voice.ShortName) return friendly

  return voice.ShortName.replace(/^[a-z]{2}-[A-Z]{2}-/, "").replace(/Neural$/, "")
}

export async function listEdgeVoices(): Promise<EdgeVoiceInfo[]> {
  const tts = new MsEdgeTTS()

  try {
    const voices = (await tts.getVoices()) as unknown as RawVoice[]

    return voices
      .filter((voice) => voice.Locale.toLowerCase().startsWith("es-"))
      .map((voice) => ({
        id: voice.ShortName,
        label: `${voice.Locale} · ${shortName(voice)}`,
        locale: voice.Locale,
        gender: voice.Gender,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } finally {
    tts.close()
  }
}

export async function synthesizeEdge(input: {
  text: string
  voice: string
  rate: number
}): Promise<string> {
  const tts = new MsEdgeTTS()

  try {
    await tts.setMetadata(input.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

    const { audioStream } = tts.toStream(input.text, { rate: input.rate })
    const chunks: Buffer[] = []

    return await new Promise<string>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      audioStream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")))
      audioStream.on("error", reject)
    })
  } finally {
    tts.close()
  }
}
