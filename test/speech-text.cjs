#!/usr/bin/env node
const { existsSync, readFileSync } = require("node:fs")
const { join } = require("node:path")
const ts = require("typescript")

function loadTs(file) {
  const source = readFileSync(file, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  new Function("exports", "module", "require", output)(module.exports, module, require)
  return module.exports
}

const { cleanForSpeech, chunkForSpeech } = loadTs(join(__dirname, "..", "src", "speech-text.ts"))
const root = join(__dirname, "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

let failures = 0

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`FAIL - ${name}: ${error.message}`)
    failures++
  }
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

test("cleanForSpeech removes code blocks when skipCode is enabled", () => {
  equal(cleanForSpeech("Antes\n```js\nconst x = 1\n```\nDespués", true), "Antes Después", "text")
})

test("cleanForSpeech keeps code content when skipCode is disabled", () => {
  equal(cleanForSpeech("Antes\n```js\nconst x = 1\n```\nDespués", false), "Antes const x = 1. Después", "text")
})

test("cleanForSpeech strips Markdown syntax", () => {
  const input = "# Título\n\n**Negrita** y [enlace](https://example.com).\n\n- uno\n- dos"
  equal(cleanForSpeech(input, true), "Título. Negrita y enlace. uno dos", "text")
})

test("chunkForSpeech returns no chunks for empty text", () => {
  equal(chunkForSpeech("   ").length, 0, "chunks")
})

test("chunkForSpeech splits long text at word boundaries", () => {
  const chunks = chunkForSpeech("uno dos tres cuatro cinco seis", 12)
  if (chunks.length !== 3) throw new Error(`expected 3 chunks, got ${chunks.length}`)
  for (const chunk of chunks) {
    if (chunk.length > 12) throw new Error(`chunk too long: ${JSON.stringify(chunk)}`)
  }
  equal(chunks.join(" "), "uno dos tres cuatro cinco seis", "rejoined")
})

test("chunkForSpeech keeps sentences together when they fit", () => {
  const chunks = chunkForSpeech("Hola. Mundo.", 20)
  equal(chunks.length, 1, "chunks")
  equal(chunks[0], "Hola. Mundo.", "text")
})

test("package exports the TUI part", () => {
  equal(pkg.exports["./tui"], "./src/tui.ts", "export")
  if (!existsSync(join(root, "src", "tui.ts"))) throw new Error("src/tui.ts missing")
})

if (failures > 0) process.exit(1)
