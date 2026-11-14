/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { Plugin } from "@opencode/plugin/tui"

export type TuiMode = "idle" | "recording" | "transcribing" | "reading" | "paused"

export interface StatusActions {
  dictate(): void | Promise<void>
  read(): void | Promise<void>
  pause(): void
}

export interface StatusController {
  setMode(mode: TuiMode): void
  dispose(): void
}

/**
 * Adds a small clickable row above the composer:
 *
 *   🎤 Dictar │ 🔊 Leer │ ⏸ Pausar
 *
 * The commands and keybinds remain available. Mouse clicks depend on the
 * terminal forwarding mouse events, which most modern terminals do.
 */
export function createStatusController(context: Plugin.Context, actions: StatusActions): StatusController {
  const [mode, setMode] = createSignal<TuiMode>("idle")

  const Status = () => {
    const current = mode()
    const busy = current === "transcribing"
    const reading = current === "reading" || current === "paused"

    const dictateLabel =
      current === "recording" ? "⏺ Parar" : current === "transcribing" ? "⏳ Transcribiendo…" : "🎤 Dictar"

    return (
      <box flexDirection="row" gap={1}>
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={context.theme.background.raised.base}
          onMouseDown={() => {
            if (!busy) void actions.dictate()
          }}
        >
          <text fg={context.theme.text.base}>{dictateLabel}</text>
        </box>
        <text fg={context.theme.text.faint}>│</text>
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={context.theme.background.raised.base}
          onMouseDown={() => {
            if (!busy) void actions.read()
          }}
        >
          <text fg={context.theme.text.base}>{reading ? "⏹ Detener" : "🔊 Leer"}</text>
        </box>
        {reading ? (
          <>
            <text fg={context.theme.text.faint}>│</text>
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={context.theme.background.raised.base}
              onMouseDown={() => actions.pause()}
            >
              <text fg={context.theme.text.base}>{current === "paused" ? "▶ Reanudar" : "⏸ Pausar"}</text>
            </box>
          </>
        ) : null}
      </box>
    )
  }

  const dispose = context.ui.slot({
    append: "session.composer.top",
    render: () => <Status />,
  })

  return { setMode, dispose }
}
