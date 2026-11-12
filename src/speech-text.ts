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
