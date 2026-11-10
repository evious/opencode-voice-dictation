/**
 * RPC errors do not always arrive as `Error` instances: the bridge may deliver
 * a plain object. Extract the useful text so the UI shows the real cause (for
 * example, a missing ffmpeg) instead of a generic message.
 */
export function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message) return cause.message
  if (typeof cause === "string" && cause) return cause

  if (cause && typeof cause === "object") {
    const value = cause as Record<string, unknown>

    for (const key of ["message", "error", "detail", "defect"]) {
      const found = value[key]
      if (typeof found === "string" && found) return found
    }

    const data = value.data
    if (data && typeof data === "object") {
      const message = (data as Record<string, unknown>).message
      if (typeof message === "string" && message) return message
    }

    try {
      const json = JSON.stringify(cause)
      if (json && json !== "{}") return json
    } catch {
      return fallback
    }
  }

  return fallback
}
