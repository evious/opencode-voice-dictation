"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const b=require("@opencode/plugin/gui"),d=require("effect"),A=require("node:child_process"),z=require("node:crypto"),R=require("node:fs"),D=require("node:os"),T=require("node:path"),m=require("solid-js/web"),N=require("solid-js"),X=b.Plugin.define({os:["windows"],stores:{prefs:b.Store.global(d.Schema.Struct({locale:d.Schema.String,minConfidence:d.Schema.Number,trailingSpace:d.Schema.Boolean,autoFocus:d.Schema.Boolean}),{locale:"es-ES",minConfidence:.4,trailingSpace:!0,autoFocus:!0}),speech:b.Store.global(d.Schema.Struct({voiceURI:d.Schema.String,rate:d.Schema.Number,skipCode:d.Schema.Boolean}),{voiceURI:"",rate:1,skipCode:!0})},i18n:{en:{"pill.idle":"Dictate","pill.starting":"Starting…","pill.listening":"Listening…","pill.error":"Retry dictation","pill.title":"Voice dictation","pill.stop":"Stop dictation","command.toggle":"Toggle voice dictation","command.toggle.description":"Transcribe what you say into the prompt","command.configure":"Voice dictation settings","error.title":"Voice dictation","error.language":"The speech language {locale} is not installed. Available: {available}.","error.none":"Windows has no speech recognizer installed. Settings › Time & language › Language › Speech.","error.mic":"No microphone is available for speech recognition.","error.system":"System.Speech is not available in this Windows installation.","error.exit":"The dictation engine stopped unexpectedly.","error.unknown":"Dictation failed ({code}).","toast.discarded":"Dictation discarded: the active session changed.","settings.title":"Voice dictation","settings.description":"Offline dictation with the Windows speech recognizer. The text is inserted into the prompt; it is never sent automatically.","settings.section":"Dictation","settings.language":"Language","settings.language.description":"A speech recognizer installed in Windows. Accents and punctuation depend on it.","settings.confidence":"Minimum confidence","settings.confidence.description":"Results below this threshold are ignored to avoid noise.","confidence.low":"Low (0.2)","confidence.normal":"Normal (0.4)","confidence.high":"High (0.6)","settings.space":"Add a space before the text","settings.space.description":"Separates the dictation from what is already in the prompt.","settings.focus":"Focus the prompt after dictating","settings.focus.description":"Moves the cursor to the prompt so you can review or send it.","settings.test.section":"Diagnostics","settings.test":"Test microphone","settings.test.description":"Checks installed recognizers and the default microphone.","settings.test.run":"Run test","settings.test.success":"Speech recognition ready: {locale}","settings.test.failed":"Not ready: {reason}","common.reason.no-recognizers":"no speech language installed","common.reason.no-microphone":"no microphone available","read.idle":"Read","read.speaking":"Reading…","read.stop":"Stop reading","read.title":"Read the last message aloud","command.read":"Read the last message aloud","command.read.description":"Speaks the last reply with a system voice","read.noSession":"Open a conversation to read its last message.","read.empty":"The last message has no text to read.","read.error":"The last message could not be read.","read.noVoices":"Windows has no voices installed for reading.","speech.section":"Read aloud","speech.voice":"Voice","speech.voice.description":"A system voice. Automatic picks one in the app language.","speech.voice.auto":"Automatic","speech.rate":"Speed","speech.rate.description":"How fast the text is spoken.","speech.rate.slow":"0.8×","speech.rate.normal":"1×","speech.rate.fast":"1.2×","speech.rate.faster":"1.5×","speech.skipCode":"Skip code blocks","speech.skipCode.description":"Read only the prose; code, paths and commands are left out.","speech.preview":"Test voice","speech.preview.description":"Speaks a short sample with the current voice and speed.","speech.preview.text":"Hello, this is a reading test."},es:{"pill.idle":"Dictar","pill.starting":"Iniciando…","pill.listening":"Escuchando…","pill.error":"Reintentar dictado","pill.title":"Dictado por voz","pill.stop":"Detener dictado","command.toggle":"Alternar dictado por voz","command.toggle.description":"Transcribe lo que dices en el prompt","command.configure":"Ajustes de dictado por voz","error.title":"Dictado por voz","error.language":"El idioma de reconocimiento {locale} no está instalado. Disponibles: {available}.","error.none":"Windows no tiene ningún reconocedor de voz instalado. Configuración › Hora e idioma › Idioma › Voz.","error.mic":"No hay ningún micrófono disponible para el reconocimiento de voz.","error.system":"System.Speech no está disponible en esta instalación de Windows.","error.exit":"El motor de dictado se detuvo inesperadamente.","error.unknown":"El dictado falló ({code}).","toast.discarded":"Dictado descartado: la sesión activa cambió.","settings.title":"Dictado por voz","settings.description":"Dictado offline con el reconocedor de voz de Windows. El texto se inserta en el prompt; nunca se envía solo.","settings.section":"Dictado","settings.language":"Idioma","settings.language.description":"Un reconocedor instalado en Windows. Los acentos y la puntuación dependen de él.","settings.confidence":"Confianza mínima","settings.confidence.description":"Los resultados por debajo de este umbral se ignoran para evitar ruido.","confidence.low":"Baja (0,2)","confidence.normal":"Normal (0,4)","confidence.high":"Alta (0,6)","settings.space":"Añadir un espacio antes del texto","settings.space.description":"Separa el dictado de lo que ya hay en el prompt.","settings.focus":"Enfocar el prompt al terminar","settings.focus.description":"Mueve el cursor al prompt para revisar o enviar el texto.","settings.test.section":"Diagnóstico","settings.test":"Probar micrófono","settings.test.description":"Comprueba los reconocedores instalados y el micrófono predeterminado.","settings.test.run":"Ejecutar prueba","settings.test.success":"Reconocimiento de voz listo: {locale}","settings.test.failed":"No está listo: {reason}","common.reason.no-recognizers":"no hay ningún idioma de voz instalado","common.reason.no-microphone":"no hay micrófono disponible","read.idle":"Leer","read.speaking":"Leyendo…","read.stop":"Detener lectura","read.title":"Leer en voz alta el último mensaje","command.read":"Leer en voz alta el último mensaje","command.read.description":"Reproduce la última respuesta con una voz del sistema","read.noSession":"Abre una conversación para leer su último mensaje.","read.empty":"El último mensaje no tiene texto para leer.","read.error":"No se pudo leer el último mensaje.","read.noVoices":"Windows no tiene voces instaladas para la lectura.","speech.section":"Lectura en voz alta","speech.voice":"Voz","speech.voice.description":"Una voz del sistema. Automática elige una en el idioma de la app.","speech.voice.auto":"Automática","speech.rate":"Velocidad","speech.rate.description":"A qué ritmo se lee el texto.","speech.rate.slow":"0,8×","speech.rate.normal":"1×","speech.rate.fast":"1,2×","speech.rate.faster":"1,5×","speech.skipCode":"Ignorar bloques de código","speech.skipCode.description":"Lee solo la prosa; omite código, rutas y comandos.","speech.preview":"Probar voz","speech.preview.description":"Lee una frase corta con la voz y velocidad actuales.","speech.preview.text":"Hola, esta es una prueba de lectura."}}}),O=b.Ipc.define({id:"voice-dictation.dictation",state:d.Schema.Struct({status:d.Schema.Literals(["idle","starting","listening","error"]),error:d.Schema.String,locale:d.Schema.String}),methods:{start:{input:d.Schema.Struct({locale:d.Schema.String,minConfidence:d.Schema.Number})},stop:{},diagnose:{output:d.Schema.Struct({locales:d.Schema.Array(d.Schema.String),microphone:d.Schema.Boolean,selected:d.Schema.String,error:d.Schema.String})}},events:{final:d.Schema.Struct({text:d.Schema.String,confidence:d.Schema.Number}),error:d.Schema.Struct({code:d.Schema.String,detail:d.Schema.String,available:d.Schema.Array(d.Schema.String)})}}),V=b.Ipc.define({id:"voice-dictation.speech",methods:{speak:{input:d.Schema.Struct({text:d.Schema.String,rate:d.Schema.Number,voice:d.Schema.String})},stop:{},voices:{output:d.Schema.Array(d.Schema.String)}},events:{done:d.Schema.Struct({ok:d.Schema.Boolean})}}),F=String.raw`param(
  [string]$Culture = "es-ES",
  [double]$MinConfidence = 0.4,
  [switch]$Diagnose
)

$ErrorActionPreference = "Stop"

try {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = $utf8
} catch { }

function Emit {
  param([hashtable]$Payload)
  [Console]::Out.WriteLine(($Payload | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}

try {
  Add-Type -AssemblyName System.Speech
} catch {
  Emit @{ type = "error"; code = "SYSTEM_SPEECH_UNAVAILABLE"; detail = "$($_.Exception.Message)"; available = @() }
  exit 2
}

$installed = @()
try {
  foreach ($entry in [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()) {
    $installed += $entry.Culture.Name
  }
} catch { }

$selected = ""
foreach ($name in $installed) {
  if ($name -eq $Culture) { $selected = $name; break }
}
if ($selected -eq "") {
  $base = ($Culture -split "-")[0]
  foreach ($name in $installed) {
    if (($name -split "-")[0] -eq $base) { $selected = $name; break }
  }
}

if ($Diagnose) {
  $microphone = $false
  $problem = ""
  if ($installed.Count -gt 0) {
    try {
      $probeCulture = New-Object System.Globalization.CultureInfo($installed[0])
      $probe = New-Object System.Speech.Recognition.SpeechRecognitionEngine($probeCulture)
      $probe.SetInputToDefaultAudioDevice()
      $microphone = $true
      $probe.Dispose()
    } catch {
      $problem = "$($_.Exception.Message)"
    }
  } else {
    $problem = "NO_RECOGNIZERS"
  }
  Emit @{ type = "diagnose"; locales = @($installed); microphone = $microphone; selected = $selected; error = $problem }
  exit 0
}

if ($installed.Count -eq 0) {
  Emit @{ type = "error"; code = "NO_RECOGNIZERS"; detail = ""; available = @() }
  exit 3
}

if ($selected -eq "") {
  Emit @{ type = "error"; code = "LANGUAGE_NOT_AVAILABLE"; detail = $Culture; available = @($installed) }
  exit 4
}

try {
  $cultureInfo = New-Object System.Globalization.CultureInfo($selected)
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($cultureInfo)
  $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $recognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(10)
  $recognizer.BabbleTimeout = [TimeSpan]::FromSeconds(5)
  $recognizer.EndSilenceTimeout = [TimeSpan]::FromSeconds(0.6)
  $recognizer.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(1.2)
  $recognizer.SetInputToDefaultAudioDevice()
} catch {
  Emit @{ type = "error"; code = "MICROPHONE_UNAVAILABLE"; detail = "$($_.Exception.Message)"; available = @($installed) }
  exit 5
}

Emit @{ type = "ready"; locale = $selected; requested = $Culture }

$failures = 0
while ($true) {
  try {
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds(5))
    $failures = 0
    if ($result -ne $null -and $result.Text -ne "" -and $result.Confidence -ge $MinConfidence) {
      Emit @{ type = "final"; text = $result.Text; confidence = [math]::Round($result.Confidence, 3); locale = $selected }
    }
  } catch {
    $failures++
    if ($failures -ge 5) {
      Emit @{ type = "error"; code = "RECOGNITION_FAILED"; detail = "$($_.Exception.Message)"; available = @() }
      exit 6
    }
    Start-Sleep -Milliseconds 250
  }
}
`,J="powershell.exe";function U(){const e=T.join(D.tmpdir(),"opencode-voice-dictation");R.mkdirSync(e,{recursive:!0});const t=z.createHash("sha1").update(F).digest("hex").slice(0,12),i=T.join(e,`dictation-${t}.ps1`);return R.writeFileSync(i,F,"utf8"),i}function j(e){return A.spawn(J,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function B(e){const t=e.pid;if(t===void 0){e.kill();return}A.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function K(e,t){const i=j(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",U(),"-Culture",e.locale,"-MinConfidence",String(e.minConfidence)]);let c=!1,r="",s="";const g=o=>{switch(o.type){case"ready":t.onReady(o.locale??e.locale);break;case"final":o.text&&t.onFinal(o.text,o.confidence??0);break;case"error":t.onError(o.code??"UNKNOWN",o.detail??"",o.available??[]);break}};return i.stdout?.setEncoding("utf8"),i.stdout?.on("data",o=>{s+=o;let a=s.indexOf(`
`);for(;a>=0;){const l=s.slice(0,a).replace(/\r$/,"").trim();if(s=s.slice(a+1),l)try{g(JSON.parse(l))}catch{}a=s.indexOf(`
`)}}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",o=>{r=(r+o).slice(-2e3)}),i.on("error",o=>{c||t.onError("ENGINE_START_FAILED",o.message,[])}),i.on("close",o=>{c||t.onExit(o,r.trim().slice(-500))}),{stop(){c=!0,B(i)}}}function Z(){return new Promise((e,t)=>{const i=j(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",U(),"-Diagnose"]);let c="",r="",s=!1;const g=(a,l)=>{s||(s=!0,clearTimeout(o),a?t(a):e(l))},o=setTimeout(()=>{B(i),g(new Error("diagnose timed out"))},2e4);i.stdout?.setEncoding("utf8"),i.stdout?.on("data",a=>{c+=a}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",a=>{r+=a}),i.on("error",a=>g(a)),i.on("close",()=>{const a=c.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.startsWith("{")).at(-1);if(!a){g(new Error(r.trim()||"no output from PowerShell"));return}try{const l=JSON.parse(a);g(void 0,{locales:l.locales??[],microphone:l.microphone===!0,selected:l.selected??"",error:l.error??""})}catch(l){g(l instanceof Error?l:new Error(String(l)))}})})}const P=String.raw`param(
  [string]$TextFile = "",
  [int]$Rate = 0,
  [string]$Voice = "",
  [switch]$ListVoices
)

$ErrorActionPreference = "Stop"

try {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = $utf8
} catch { }

try {
  Add-Type -AssemblyName System.Speech
} catch {
  exit 2
}

try {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
} catch {
  exit 3
}

if ($ListVoices) {
  try {
    foreach ($entry in $synth.GetInstalledVoices()) {
      if ($entry.Enabled) {
        [Console]::Out.WriteLine($entry.VoiceInfo.Name)
      }
    }
  } catch { }
  $synth.Dispose()
  exit 0
}

if ($Rate -lt -10) { $Rate = -10 }
if ($Rate -gt 10) { $Rate = 10 }

try { $synth.Rate = $Rate } catch { }

if ($Voice -ne "") {
  try { $synth.SelectVoice($Voice) } catch { }
}

try {
  $text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
  $synth.Speak($text)
} catch { }

$synth.Dispose()
`,Y="powershell.exe";function G(){const e=T.join(D.tmpdir(),"opencode-voice-dictation");return R.mkdirSync(e,{recursive:!0}),e}function M(){const e=z.createHash("sha1").update(P).digest("hex").slice(0,12),t=T.join(G(),`speak-${e}.ps1`);return R.writeFileSync(t,P,"utf8"),t}function Q(e){const t=T.join(G(),`speech-${z.randomUUID()}.txt`);return R.writeFileSync(t,e,"utf8"),t}function q(e){return A.spawn(Y,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function H(e){const t=e.pid;if(t===void 0){e.kill();return}A.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function x(e){return Math.max(-10,Math.min(10,Math.round((e-1)*5)))}function ee(e,t){const i=Q(e.text),c=q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",M(),"-TextFile",i,"-Rate",String(x(e.rate)),"-Voice",e.voice]);let r=!1;const s=()=>{try{R.rmSync(i,{force:!0})}catch{}};return c.on("error",()=>{s(),r||t(!1)}),c.on("close",g=>{s(),r||t(g===0)}),{stop(){r=!0,H(c),s()}}}function te(){return new Promise(e=>{const t=q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",M(),"-ListVoices"]);let i="",c=!1;const r=g=>{c||(c=!0,clearTimeout(s),e(g))},s=setTimeout(()=>{H(t),r([])},1e4);t.stdout?.setEncoding("utf8"),t.stdout?.on("data",g=>{i+=g}),t.on("error",()=>r([])),t.on("close",()=>{const g=i.split(/\r?\n/).map(o=>o.trim()).filter(o=>o.length>0);r(g)})})}const ie=e=>{let t="idle",i="",c="",r,s=!1;const g=()=>{r=void 0,s=!1},o=e.provide(O,{state:()=>({status:t,error:i,locale:c}),start(S,w){r&&(s=!0,r.stop(),g()),t="starting",i="",c=S.locale,o.changed();const p=w.window;try{r=K({locale:S.locale,minConfidence:S.minConfidence},{onReady(u){t="listening",c=u,o.changed()},onFinal(u,h){o.emit("final",{text:u,confidence:h},p)},onError(u,h,C){t="error",i=u,o.changed(),o.emit("error",{code:u,detail:h,available:C},p)},onExit(u,h){if(s){g(),t="idle",i="",c="",o.changed();return}g(),t!=="error"&&(t="error",i=u===null?"ENGINE_EXIT":`ENGINE_EXIT_${u}`,o.changed(),o.emit("error",{code:"ENGINE_EXIT",detail:h||(u===null?"":String(u)),available:[]},p))}})}catch(u){throw t="error",i="ENGINE_START_FAILED",o.changed(),u}},stop(){r&&(s=!0,r.stop(),g()),t="idle",i="",c="",o.changed()},diagnose(){return Z()}});let a;const l=e.provide(V,{speak(S){a?.stop(),a=ee(S,w=>{a=void 0,l.emit("done",{ok:w})})},stop(){a&&(a.stop(),a=void 0),l.emit("done",{ok:!0})},voices(){return te()}});e.onCleanup(()=>{r&&(s=!0,r.stop(),g()),a?.stop(),a=void 0})},ne=250;function oe(e,t){let i=e.replace(/\r\n/g,`
`);return t?i=i.replace(/```[\s\S]*?```/g," "):i=i.replace(/```[^\n]*\n([\s\S]*?)```/g,"$1"),i=i.replace(/`([^`]+)`/g,"$1"),i=i.replace(/!\[[^\]]*\]\([^)]*\)/g," "),i=i.replace(/\[([^\]]+)\]\([^)]*\)/g,"$1"),i=i.replace(/^\s*#{1,6}\s+/gm,""),i=i.replace(/^\s*>\s?/gm,""),i=i.replace(/^\s*[-*+]\s+/gm,""),i=i.replace(/^\s*\d+\.\s+/gm,""),i=i.replace(/(\*\*|__)(.*?)\1/g,"$2"),i=i.replace(/(\*|_)(.*?)\1/g,"$2"),i=i.replace(/^\s*\|.*\|\s*$/gm," "),i=i.replace(/\n{2,}/g,". "),i=i.replace(/\n/g," "),i=i.replace(/\s+/g," "),i=i.replace(/\s+([.,;:!?])/g,"$1"),i=i.replace(/([.,;:!?]){2,}/g,"$1"),i.trim()}function re(e,t=ne){const i=e.trim();if(!i)return[];const c=i.split(new RegExp("(?<=[.!?…])\\s+")),r=[];let s="";const g=o=>{let a="";for(const l of o.split(/\s+/))l&&(a&&a.length+1+l.length>t?(r.push(a),a=l):a=a?`${a} ${l}`:l);return a};for(const o of c){if(o.length>t){s&&(r.push(s),s=""),s=g(o);continue}s&&s.length+1+o.length>t?(r.push(s),s=o):s=s?`${s} ${o}`:o}return s&&r.push(s),r}function se(e,t){const i=e.stores.speech,[c,r]=N.createSignal(!1),[s,g]=N.createSignal([]),[o,a]=N.createSignal("none");let l=0,S=[];const w=()=>typeof globalThis.speechSynthesis<"u"?globalThis.speechSynthesis:void 0,p=()=>{const v=w()?.getVoices()??[];if(v.length===0)return;const f=i.value.voiceURI;if(f){const $=v.find(I=>I.voiceURI===f);if($)return $}const y=e.locale.locale().split("-")[0]?.toLowerCase()??"es";return v.find($=>$.lang.toLowerCase().startsWith(y))??v[0]},u=async()=>{const v=w()?.getVoices()??[];if(v.length>0){g(v.map(f=>({id:f.voiceURI,label:`${f.name} — ${f.lang}`}))),a("web");return}try{const f=await t.voices();if(f.length>0){g(f.map(y=>({id:y,label:y}))),a("sapi");return}}catch{}a("none")},h=()=>{l++,S=[],w()?.cancel(),r(!1),t.stop().catch(()=>{})},C=async v=>{const f=oe(v,i.value.skipCode);if(!f)return!1;if(h(),await u(),o()==="web"){const y=w();if(!y)return!1;const $=p(),I=i.value.rate,W=l;S=re(f),r(!0);const L=()=>{if(W!==l)return;const _=S.shift();if(!_){r(!1);return}const k=new SpeechSynthesisUtterance(_);$&&(k.voice=$),$?.lang&&(k.lang=$.lang),k.rate=I,k.onend=L,k.onerror=L,y.speak(k)};return L(),!0}if(o()==="sapi"){r(!0);try{await t.speak({text:f,rate:i.value.rate,voice:i.value.voiceURI})}catch(y){throw r(!1),y}return!0}throw r(!1),new Error(e.t("read.noVoices"))},n=async()=>{const v=e.sessions.current();if(!v)return"";const y=(await v.server.client.message.list({sessionID:v.id,type:"assistant",order:"desc",limit:1})).data[0];return!y||y.type!=="assistant"?"":y.content.filter($=>$.type==="text").map($=>$.text).join(`
`)};return t.on("done",()=>r(!1)),w()?.addEventListener?.("voiceschanged",()=>{u()}),u(),{speaking:c,backend:o,voices:s,refreshVoices:u,lastAssistantText:n,speak:C,cancel:h,preview:()=>C(e.t("speech.preview.text"))}}const ae=["es-ES","es-MX","es-AR","es-CO","pt-BR","pt-PT","en-US","en-GB","fr-FR","de-DE","it-IT"];function ce(e){const t=b.usePlugin(),i=t.ui,c=t.stores.prefs,r=t.stores.speech,s=t.main(O),[g,o]=N.createSignal([]),[a,l]=N.createSignal(!1);N.onMount(()=>{s.diagnose().then(n=>{n.locales.length>0&&o(n.locales)}).catch(()=>{}),e.speaker.refreshVoices()});const S=()=>{const n=g(),E=c.value.locale;return(n.includes(E)?n:[E,...n]).map(f=>({value:f,label:f}))},w=()=>[{value:"",label:t.t("speech.voice.auto")},...e.speaker.voices().map(n=>({value:n.id,label:n.label}))],p=n=>{c.update(E=>{n.locale!==void 0&&(E.locale=n.locale),n.minConfidence!==void 0&&(E.minConfidence=n.minConfidence),n.trailingSpace!==void 0&&(E.trailingSpace=n.trailingSpace),n.autoFocus!==void 0&&(E.autoFocus=n.autoFocus)})},u=n=>{r.update(E=>{n.voiceURI!==void 0&&(E.voiceURI=n.voiceURI),n.rate!==void 0&&(E.rate=n.rate),n.skipCode!==void 0&&(E.skipCode=n.skipCode)})},h=async()=>{try{await e.speaker.preview()}catch(n){t.toast.show({variant:"error",title:t.t("read.title"),description:n instanceof Error?n.message:t.t("read.error")})}},C=async()=>{l(!0);try{const n=await s.diagnose();if(n.locales.length===0){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-recognizers")}),persistent:!0});return}if(!n.microphone){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-microphone")}),persistent:!0});return}n.locales.length>0&&!g().length&&o(n.locales),t.toast.show({variant:"success",title:t.t("error.title"),description:t.t("settings.test.success",{locale:n.selected||n.locales[0]||c.value.locale})})}catch(n){t.toast.show({variant:"error",title:t.t("error.title"),description:n instanceof Error?n.message:String(n)})}finally{l(!1)}};return m.createComponent(i.SettingsLayout,{get title(){return t.t("settings.title")},get description(){return t.t("settings.description")},get children(){return[m.createComponent(i.SettingsSection,{get title(){return t.t("settings.section")},get children(){return[m.createComponent(i.SettingsRow,{id:"language",get title(){return t.t("settings.language")},get description(){return t.t("settings.language.description")},get children(){return m.createComponent(i.Select,{get label(){return t.t("settings.language")},get value(){return c.value.locale},get options(){return m.memo(()=>S().length>0)()?S():ae.map(n=>({value:n,label:n}))},onChange:n=>p({locale:n})})}}),m.createComponent(i.SettingsRow,{id:"confidence",get title(){return t.t("settings.confidence")},get description(){return t.t("settings.confidence.description")},get children(){return m.createComponent(i.Select,{get label(){return t.t("settings.confidence")},get value(){return String(c.value.minConfidence)},get options(){return[{value:"0.2",label:t.t("confidence.low")},{value:"0.4",label:t.t("confidence.normal")},{value:"0.6",label:t.t("confidence.high")}]},onChange:n=>p({minConfidence:Number(n)||.4})})}}),m.createComponent(i.SettingsRow,{id:"space",get title(){return t.t("settings.space")},get description(){return t.t("settings.space.description")},get children(){return m.createComponent(i.Switch,{get label(){return t.t("settings.space")},hideLabel:!0,get checked(){return c.value.trailingSpace},onChange:n=>p({trailingSpace:n})})}}),m.createComponent(i.SettingsRow,{id:"focus",get title(){return t.t("settings.focus")},get description(){return t.t("settings.focus.description")},get children(){return m.createComponent(i.Switch,{get label(){return t.t("settings.focus")},hideLabel:!0,get checked(){return c.value.autoFocus},onChange:n=>p({autoFocus:n})})}})]}}),m.createComponent(i.SettingsSection,{get title(){return t.t("speech.section")},get children(){return[m.createComponent(i.SettingsRow,{id:"voice",get title(){return t.t("speech.voice")},get description(){return t.t("speech.voice.description")},get children(){return m.createComponent(i.Select,{get label(){return t.t("speech.voice")},get value(){return r.value.voiceURI},get options(){return w()},onChange:n=>u({voiceURI:n})})}}),m.createComponent(i.SettingsRow,{id:"rate",get title(){return t.t("speech.rate")},get description(){return t.t("speech.rate.description")},get children(){return m.createComponent(i.Select,{get label(){return t.t("speech.rate")},get value(){return String(r.value.rate)},get options(){return[{value:"0.8",label:t.t("speech.rate.slow")},{value:"1",label:t.t("speech.rate.normal")},{value:"1.2",label:t.t("speech.rate.fast")},{value:"1.5",label:t.t("speech.rate.faster")}]},onChange:n=>u({rate:Number(n)||1})})}}),m.createComponent(i.SettingsRow,{id:"skip-code",get title(){return t.t("speech.skipCode")},get description(){return t.t("speech.skipCode.description")},get children(){return m.createComponent(i.Switch,{get label(){return t.t("speech.skipCode")},hideLabel:!0,get checked(){return r.value.skipCode},onChange:n=>u({skipCode:n})})}}),m.createComponent(i.SettingsRow,{id:"preview",get title(){return t.t("speech.preview")},get description(){return t.t("speech.preview.description")},get children(){return m.createComponent(i.Button,{onClick:()=>{h()},get children(){return t.t("read.idle")}})}})]}}),m.createComponent(i.SettingsSection,{get title(){return t.t("settings.test.section")},get children(){return m.createComponent(i.SettingsRow,{id:"test",get title(){return t.t("settings.test")},get description(){return t.t("settings.test.description")},get children(){return m.createComponent(i.Button,{get busy(){return a()},onClick:()=>{C()},get children(){return t.t("settings.test.run")}})}})}})]}})}const le=e=>{const t=e.main(O),i=e.main(V),c=se(e,i),r=e.stores.prefs;let s;const g=(p,u,h)=>{switch(p){case"LANGUAGE_NOT_AVAILABLE":return e.t("error.language",{locale:u||r.value.locale,available:h.length>0?h.join(", "):"—"});case"NO_RECOGNIZERS":return e.t("error.none");case"MICROPHONE_UNAVAILABLE":return e.t("error.mic");case"SYSTEM_SPEECH_UNAVAILABLE":return e.t("error.system");case"ENGINE_EXIT":return e.t("error.exit");default:return e.t("error.unknown",{code:p})}},o=()=>{c.cancel(),s=e.sessions.current()?.key,t.start({locale:r.value.locale,minConfidence:r.value.minConfidence}).catch(p=>{e.toast.show({variant:"error",title:e.t("error.title"),description:p instanceof Error?p.message:String(p)})})},a=()=>{t.stop().catch(()=>{})},l=()=>{const p=t.state()?.status??"idle";p==="starting"||p==="listening"?a():o()},S=()=>{if(c.speaking()){c.cancel();return}if(!e.sessions.current()){e.toast.show({variant:"error",title:e.t("read.title"),description:e.t("read.noSession")});return}const p=t.state()?.status??"idle";(p==="starting"||p==="listening")&&t.stop().catch(()=>{}),(async()=>{try{const u=await c.lastAssistantText();if(!u.trim()){e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")});return}await c.speak(u)||e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")})}catch(u){e.toast.show({variant:"error",title:e.t("read.title"),description:u instanceof Error?u.message:e.t("read.error")})}})()};t.on("final",p=>{const u=e.sessions.current()?.key;if(s&&u&&u!==s){e.toast.show({variant:"error",title:e.t("error.title"),description:e.t("toast.discarded")});return}const h=e.screen.current()?.composer;if(!h)return;const C=h.text(),n=r.value.trailingSpace&&C.length>0&&!/\s$/.test(C)?" ":"";h.insert(n+p.text),r.value.autoFocus&&h.focus()}),t.on("error",p=>{e.toast.show({variant:"error",title:e.t("error.title"),description:g(p.code,p.detail,p.available),persistent:p.code==="LANGUAGE_NOT_AVAILABLE"||p.code==="NO_RECOGNIZERS",duration:8e3})});const w=()=>{if(e.app.platform!=="desktop")return;const p=t.state()?.status??"idle";return p==="starting"?{label:e.t("pill.starting"),icon:"outline-wave-audio",title:e.t("pill.title"),run:l}:p==="listening"?{label:e.t("pill.listening"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:l}:p==="error"?{label:e.t("pill.error"),icon:"outline-wave-audio",tone:"warning",title:e.t("pill.title"),run:l}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.title"),run:l}};e.add(b.ComposerPill,()=>({id:"dictate",show:()=>w()})),e.add(b.ComposerPill,()=>({id:"read",order:1,show:()=>{if(e.app.platform==="desktop")return c.speaking()?{label:e.t("read.speaking"),icon:"outline-audio",tone:"success",title:e.t("read.stop"),run:S}:{label:e.t("read.idle"),icon:"outline-audio",title:e.t("read.title"),run:S}}})),e.add(b.Command,()=>({id:"toggle",title:e.t("command.toggle"),description:e.t("command.toggle.description"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+m",slash:{name:"dictado"},editable:!0,enabled:e.app.platform==="desktop",run:l})),e.add(b.Command,()=>({id:"configure",title:e.t("command.configure"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),enabled:e.app.platform==="desktop",run:()=>e.layout.settings(e.id)})),e.add(b.Command,()=>({id:"read",title:e.t("command.read"),description:e.t("command.read.description"),keywords:"read aloud speech voice leer voz altavoz lectura",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+l",slash:{name:"leer"},editable:!0,enabled:e.app.platform==="desktop",run:S})),e.add(b.SettingsPage,{id:e.id,icon:"outline-audio",get title(){return e.t("settings.title")},get entries(){return[{id:"language",title:e.t("settings.language"),keywords:"voice language idioma voz"},{id:"confidence",title:e.t("settings.confidence"),keywords:"voice confidence confianza"},{id:"test",title:e.t("settings.test"),keywords:"voice microphone microphone test microfono"},{id:"voice",title:e.t("speech.voice"),keywords:"read aloud voice voz lectura altavoz"},{id:"rate",title:e.t("speech.rate"),keywords:"read aloud speed velocidad lectura"},{id:"skip-code",title:e.t("speech.skipCode"),keywords:"read aloud code codigo lectura"},{id:"preview",title:e.t("speech.preview"),keywords:"read aloud test voice probar voz"}]},render:()=>m.createComponent(ce,{speaker:c})})},de=b.Plugin.define({...X,setup:le,main:ie});exports.default=de;
