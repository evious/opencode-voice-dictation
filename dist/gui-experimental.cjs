"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const w=require("@opencode/plugin/gui"),c=require("effect"),R=require("node:child_process"),_=require("node:crypto"),k=require("node:fs"),W=require("node:os"),I=require("node:path"),g=require("solid-js/web"),C=require("solid-js"),X=w.Plugin.define({os:["windows"],stores:{prefs:w.Store.global(c.Schema.Struct({locale:c.Schema.String,minConfidence:c.Schema.Number,trailingSpace:c.Schema.Boolean,autoFocus:c.Schema.Boolean}),{locale:"es-ES",minConfidence:.4,trailingSpace:!0,autoFocus:!0}),speech:w.Store.global(c.Schema.Struct({voiceURI:c.Schema.String,rate:c.Schema.Number,skipCode:c.Schema.Boolean}),{voiceURI:"",rate:1,skipCode:!0}),engine:w.Store.global(c.Schema.Struct({mode:c.Schema.String}),{mode:"windows"})},i18n:{en:{"pill.idle":"Dictate","pill.starting":"Starting…","pill.listening":"Listening…","pill.dictating":"Dictating…","pill.error":"Retry dictation","pill.title":"Voice dictation","pill.winH":"Open Windows voice typing (Win+H)","pill.stop":"Stop dictation","command.toggle":"Toggle voice dictation","command.toggle.description":"Dictate into the prompt with the selected engine","command.configure":"Voice dictation settings","error.title":"Voice dictation","error.language":"The speech language {locale} is not installed. Available: {available}.","error.none":"Windows has no speech recognizer installed. Settings › Time & language › Language › Speech.","error.mic":"No microphone is available for speech recognition.","error.system":"System.Speech is not available in this Windows installation.","error.exit":"The dictation engine stopped unexpectedly.","error.unknown":"Dictation failed ({code}).","toast.discarded":"Dictation discarded: the active session changed.","settings.title":"Voice dictation","settings.description":"Offline dictation with the Windows speech recognizer. The text is inserted into the prompt; it is never sent automatically.","settings.section":"Dictation","settings.engine":"Dictation engine","settings.engine.description":"Windows uses Windows 11 voice typing (Win+H), which is more accurate. System.Speech works offline but is less precise.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Test Win+H","settings.winh.description":"Sends the Windows voice typing shortcut. If the floating bar appears, it works.","settings.winh.run":"Test Win+H","settings.winh.sent":"Win+H sent. If the Windows dictation bar did not appear, check Settings › Accessibility › Voice typing.","error.winh":"Windows voice typing could not be triggered.","settings.language":"Language","settings.language.description":"A speech recognizer installed in Windows. Accents and punctuation depend on it.","settings.confidence":"Minimum confidence","settings.confidence.description":"Results below this threshold are ignored to avoid noise.","confidence.low":"Low (0.2)","confidence.normal":"Normal (0.4)","confidence.high":"High (0.6)","settings.space":"Add a space before the text","settings.space.description":"Separates the dictation from what is already in the prompt.","settings.focus":"Focus the prompt after dictating","settings.focus.description":"Moves the cursor to the prompt so you can review or send it.","settings.test.section":"Diagnostics","settings.test":"Test microphone","settings.test.description":"Checks installed recognizers and the default microphone.","settings.test.run":"Run test","settings.test.success":"Speech recognition ready: {locale}","settings.test.failed":"Not ready: {reason}","common.reason.no-recognizers":"no speech language installed","common.reason.no-microphone":"no microphone available","read.idle":"Read","read.speaking":"Reading…","read.stop":"Stop reading","read.title":"Read the last message aloud","command.read":"Read the last message aloud","command.read.description":"Speaks the last reply with a system voice","read.noSession":"Open a conversation to read its last message.","read.empty":"The last message has no text to read.","read.error":"The last message could not be read.","read.noVoices":"Windows has no voices installed for reading.","speech.section":"Read aloud","speech.voice":"Voice","speech.voice.description":"A system voice. Automatic picks one in the app language.","speech.voice.auto":"Automatic","speech.rate":"Speed","speech.rate.description":"How fast the text is spoken.","speech.rate.slow":"0.8×","speech.rate.normal":"1×","speech.rate.fast":"1.2×","speech.rate.faster":"1.5×","speech.skipCode":"Skip code blocks","speech.skipCode.description":"Read only the prose; code, paths and commands are left out.","speech.preview":"Test voice","speech.preview.description":"Speaks a short sample with the current voice and speed.","speech.preview.text":"Hello, this is a reading test."},es:{"pill.idle":"Dictar","pill.starting":"Iniciando…","pill.listening":"Escuchando…","pill.dictating":"Dictando…","pill.error":"Reintentar dictado","pill.title":"Dictado por voz","pill.winH":"Abrir el dictado de Windows (Win+H)","pill.stop":"Detener dictado","command.toggle":"Alternar dictado por voz","command.toggle.description":"Dicta en el prompt con el motor elegido","command.configure":"Ajustes de dictado por voz","error.title":"Dictado por voz","error.language":"El idioma de reconocimiento {locale} no está instalado. Disponibles: {available}.","error.none":"Windows no tiene ningún reconocedor de voz instalado. Configuración › Hora e idioma › Idioma › Voz.","error.mic":"No hay ningún micrófono disponible para el reconocimiento de voz.","error.system":"System.Speech no está disponible en esta instalación de Windows.","error.exit":"El motor de dictado se detuvo inesperadamente.","error.unknown":"El dictado falló ({code}).","toast.discarded":"Dictado descartado: la sesión activa cambió.","settings.title":"Dictado por voz","settings.description":"Dictado offline con el reconocedor de voz de Windows. El texto se inserta en el prompt; nunca se envía solo.","settings.section":"Dictado","settings.engine":"Motor de dictado","settings.engine.description":"Windows usa el dictado de Windows 11 (Win+H), más preciso. System.Speech funciona sin Windows 11 pero es menos exacto.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Probar Win+H","settings.winh.description":"Envía el atajo del dictado de Windows. Si aparece la barra flotante, funciona.","settings.winh.run":"Probar Win+H","settings.winh.sent":"Win+H enviado. Si no apareció la barra, revisa Configuración › Accesibilidad › Dictado por voz.","settings.language":"Idioma","settings.language.description":"Un reconocedor instalado en Windows. Los acentos y la puntuación dependen de él.","settings.confidence":"Confianza mínima","settings.confidence.description":"Los resultados por debajo de este umbral se ignoran para evitar ruido.","confidence.low":"Baja (0,2)","confidence.normal":"Normal (0,4)","confidence.high":"Alta (0,6)","settings.space":"Añadir un espacio antes del texto","settings.space.description":"Separa el dictado de lo que ya hay en el prompt.","settings.focus":"Enfocar el prompt al terminar","settings.focus.description":"Mueve el cursor al prompt para revisar o enviar el texto.","settings.test.section":"Diagnóstico","settings.test":"Probar micrófono","settings.test.description":"Comprueba los reconocedores instalados y el micrófono predeterminado.","settings.test.run":"Ejecutar prueba","settings.test.success":"Reconocimiento de voz listo: {locale}","settings.test.failed":"No está listo: {reason}","common.reason.no-recognizers":"no hay ningún idioma de voz instalado","common.reason.no-microphone":"no hay micrófono disponible","read.idle":"Leer","read.speaking":"Leyendo…","read.stop":"Detener lectura","read.title":"Leer en voz alta el último mensaje","command.read":"Leer en voz alta el último mensaje","command.read.description":"Reproduce la última respuesta con una voz del sistema","read.noSession":"Abre una conversación para leer su último mensaje.","read.empty":"El último mensaje no tiene texto para leer.","read.error":"No se pudo leer el último mensaje.","read.noVoices":"Windows no tiene voces instaladas para la lectura.","speech.section":"Lectura en voz alta","speech.voice":"Voz","speech.voice.description":"Una voz del sistema. Automática elige una en el idioma de la app.","speech.voice.auto":"Automática","speech.rate":"Velocidad","speech.rate.description":"A qué ritmo se lee el texto.","speech.rate.slow":"0,8×","speech.rate.normal":"1×","speech.rate.fast":"1,2×","speech.rate.faster":"1,5×","speech.skipCode":"Ignorar bloques de código","speech.skipCode.description":"Lee solo la prosa; omite código, rutas y comandos.","speech.preview":"Probar voz","speech.preview.description":"Lee una frase corta con la voz y velocidad actuales.","speech.preview.text":"Hola, esta es una prueba de lectura."}}}),z=w.Ipc.define({id:"voice-dictation.dictation",state:c.Schema.Struct({status:c.Schema.Literals(["idle","starting","listening","error"]),error:c.Schema.String,locale:c.Schema.String}),methods:{start:{input:c.Schema.Struct({locale:c.Schema.String,minConfidence:c.Schema.Number})},stop:{},diagnose:{output:c.Schema.Struct({locales:c.Schema.Array(c.Schema.String),microphone:c.Schema.Boolean,selected:c.Schema.String,error:c.Schema.String})}},events:{final:c.Schema.Struct({text:c.Schema.String,confidence:c.Schema.Number}),error:c.Schema.Struct({code:c.Schema.String,detail:c.Schema.String,available:c.Schema.Array(c.Schema.String)})}}),U=w.Ipc.define({id:"voice-dictation.speech",methods:{speak:{input:c.Schema.Struct({text:c.Schema.String,rate:c.Schema.Number,voice:c.Schema.String})},stop:{},voices:{output:c.Schema.Array(c.Schema.String)}},events:{done:c.Schema.Struct({ok:c.Schema.Boolean})}}),O=w.Ipc.define({id:"voice-dictation.voice-typing",methods:{toggle:{}}}),F=String.raw`param(
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
`,Y="powershell.exe";function B(){const e=I.join(W.tmpdir(),"opencode-voice-dictation");k.mkdirSync(e,{recursive:!0});const t=_.createHash("sha1").update(F).digest("hex").slice(0,12),i=I.join(e,`dictation-${t}.ps1`);return k.writeFileSync(i,F,"utf8"),i}function j(e){return R.spawn(Y,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function M(e){const t=e.pid;if(t===void 0){e.kill();return}R.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function J(e,t){const i=j(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",B(),"-Culture",e.locale,"-MinConfidence",String(e.minConfidence)]);let l=!1,o="",s="";const p=r=>{switch(r.type){case"ready":t.onReady(r.locale??e.locale);break;case"final":r.text&&t.onFinal(r.text,r.confidence??0);break;case"error":t.onError(r.code??"UNKNOWN",r.detail??"",r.available??[]);break}};return i.stdout?.setEncoding("utf8"),i.stdout?.on("data",r=>{s+=r;let a=s.indexOf(`
`);for(;a>=0;){const d=s.slice(0,a).replace(/\r$/,"").trim();if(s=s.slice(a+1),d)try{p(JSON.parse(d))}catch{}a=s.indexOf(`
`)}}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",r=>{o=(o+r).slice(-2e3)}),i.on("error",r=>{l||t.onError("ENGINE_START_FAILED",r.message,[])}),i.on("close",r=>{l||t.onExit(r,o.trim().slice(-500))}),{stop(){l=!0,M(i)}}}function Q(){return new Promise((e,t)=>{const i=j(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",B(),"-Diagnose"]);let l="",o="",s=!1;const p=(a,d)=>{s||(s=!0,clearTimeout(r),a?t(a):e(d))},r=setTimeout(()=>{M(i),p(new Error("diagnose timed out"))},2e4);i.stdout?.setEncoding("utf8"),i.stdout?.on("data",a=>{l+=a}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",a=>{o+=a}),i.on("error",a=>p(a)),i.on("close",()=>{const a=l.split(/\r?\n/).map(d=>d.trim()).filter(d=>d.startsWith("{")).at(-1);if(!a){p(new Error(o.trim()||"no output from PowerShell"));return}try{const d=JSON.parse(a);p(void 0,{locales:d.locales??[],microphone:d.microphone===!0,selected:d.selected??"",error:d.error??""})}catch(d){p(d instanceof Error?d:new Error(String(d)))}})})}const D=String.raw`param(
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
`,x="powershell.exe";function G(){const e=I.join(W.tmpdir(),"opencode-voice-dictation");return k.mkdirSync(e,{recursive:!0}),e}function q(){const e=_.createHash("sha1").update(D).digest("hex").slice(0,12),t=I.join(G(),`speak-${e}.ps1`);return k.writeFileSync(t,D,"utf8"),t}function ee(e){const t=I.join(G(),`speech-${_.randomUUID()}.txt`);return k.writeFileSync(t,e,"utf8"),t}function K(e){return R.spawn(x,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function Z(e){const t=e.pid;if(t===void 0){e.kill();return}R.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function te(e){return Math.max(-10,Math.min(10,Math.round((e-1)*5)))}function ie(e,t){const i=ee(e.text),l=K(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",q(),"-TextFile",i,"-Rate",String(te(e.rate)),"-Voice",e.voice]);let o=!1;const s=()=>{try{k.rmSync(i,{force:!0})}catch{}};return l.on("error",()=>{s(),o||t(!1)}),l.on("close",p=>{s(),o||t(p===0)}),{stop(){o=!0,Z(l),s()}}}function ne(){return new Promise(e=>{const t=K(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",q(),"-ListVoices"]);let i="",l=!1;const o=p=>{l||(l=!0,clearTimeout(s),e(p))},s=setTimeout(()=>{Z(t),o([])},1e4);t.stdout?.setEncoding("utf8"),t.stdout?.on("data",p=>{i+=p}),t.on("error",()=>o([])),t.on("close",()=>{const p=i.split(/\r?\n/).map(r=>r.trim()).filter(r=>r.length>0);o(p)})})}const H=String.raw`$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class WinH {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

  private const byte VK_LWIN = 0x5B;
  private const byte VK_H = 0x48;
  private const uint KEYUP = 0x0002;

  public static void Send() {
    keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_H, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_H, 0, KEYUP, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    keybd_event(VK_LWIN, 0, KEYUP, UIntPtr.Zero);
  }
}
"@

[WinH]::Send()
`,oe="powershell.exe";function re(){const e=I.join(W.tmpdir(),"opencode-voice-dictation");k.mkdirSync(e,{recursive:!0});const t=_.createHash("sha1").update(H).digest("hex").slice(0,12),i=I.join(e,`win-h-${t}.ps1`);return k.writeFileSync(i,H,"utf8"),i}function se(e){return R.spawn(oe,e,{windowsHide:!0,stdio:"ignore"})}function ae(){return new Promise((e,t)=>{const i=se(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",re()]);i.on("error",l=>t(l)),i.on("close",l=>{l===0?e():t(new Error(`Win+H helper exited with code ${l??"unknown"}`))})})}const ce=e=>{let t="idle",i="",l="",o,s=!1;const p=()=>{o=void 0,s=!1},r=e.provide(z,{state:()=>({status:t,error:i,locale:l}),start(b,y){o&&(s=!0,o.stop(),p()),t="starting",i="",l=b.locale,r.changed();const E=y.window;try{o=J({locale:b.locale,minConfidence:b.minConfidence},{onReady(S){t="listening",l=S,r.changed()},onFinal(S,v){r.emit("final",{text:S,confidence:v},E)},onError(S,v,$){t="error",i=S,r.changed(),r.emit("error",{code:S,detail:v,available:$},E)},onExit(S,v){if(s){p(),t="idle",i="",l="",r.changed();return}p(),t!=="error"&&(t="error",i=S===null?"ENGINE_EXIT":`ENGINE_EXIT_${S}`,r.changed(),r.emit("error",{code:"ENGINE_EXIT",detail:v||(S===null?"":String(S)),available:[]},E))}})}catch(S){throw t="error",i="ENGINE_START_FAILED",r.changed(),S}},stop(){o&&(s=!0,o.stop(),p()),t="idle",i="",l="",r.changed()},diagnose(){return Q()}});let a;const d=e.provide(U,{speak(b){a?.stop(),a=ie(b,y=>{a=void 0,d.emit("done",{ok:y})})},stop(){a&&(a.stop(),a=void 0),d.emit("done",{ok:!0})},voices(){return ne()}});e.provide(O,{toggle(){return ae()}}),e.onCleanup(()=>{o&&(s=!0,o.stop(),p()),a?.stop(),a=void 0})},le=250;function de(e,t){let i=e.replace(/\r\n/g,`
`);return t?i=i.replace(/```[\s\S]*?```/g," "):i=i.replace(/```[^\n]*\n([\s\S]*?)```/g,"$1"),i=i.replace(/`([^`]+)`/g,"$1"),i=i.replace(/!\[[^\]]*\]\([^)]*\)/g," "),i=i.replace(/\[([^\]]+)\]\([^)]*\)/g,"$1"),i=i.replace(/^\s*#{1,6}\s+/gm,""),i=i.replace(/^\s*>\s?/gm,""),i=i.replace(/^\s*[-*+]\s+/gm,""),i=i.replace(/^\s*\d+\.\s+/gm,""),i=i.replace(/(\*\*|__)(.*?)\1/g,"$2"),i=i.replace(/(\*|_)(.*?)\1/g,"$2"),i=i.replace(/^\s*\|.*\|\s*$/gm," "),i=i.replace(/\n{2,}/g,". "),i=i.replace(/\n/g," "),i=i.replace(/\s+/g," "),i=i.replace(/\s+([.,;:!?])/g,"$1"),i=i.replace(/([.,;:!?]){2,}/g,"$1"),i.trim()}function pe(e,t=le){const i=e.trim();if(!i)return[];const l=i.split(new RegExp("(?<=[.!?…])\\s+")),o=[];let s="";const p=r=>{let a="";for(const d of r.split(/\s+/))d&&(a&&a.length+1+d.length>t?(o.push(a),a=d):a=a?`${a} ${d}`:d);return a};for(const r of l){if(r.length>t){s&&(o.push(s),s=""),s=p(r);continue}s&&s.length+1+r.length>t?(o.push(s),s=r):s=s?`${s} ${r}`:r}return s&&o.push(s),o}function ue(e,t){const i=e.stores.speech,[l,o]=C.createSignal(!1),[s,p]=C.createSignal([]),[r,a]=C.createSignal("none");let d=0,b=[];const y=()=>typeof globalThis.speechSynthesis<"u"?globalThis.speechSynthesis:void 0,E=()=>{const m=y()?.getVoices()??[];if(m.length===0)return;const f=i.value.voiceURI;if(f){const h=m.find(A=>A.voiceURI===f);if(h)return h}const n=e.locale.locale().split("-")[0]?.toLowerCase()??"es";return m.find(h=>h.lang.toLowerCase().startsWith(n))??m[0]},S=async()=>{const m=y()?.getVoices()??[];if(m.length>0){p(m.map(f=>({id:f.voiceURI,label:`${f.name} — ${f.lang}`}))),a("web");return}try{const f=await t.voices();if(f.length>0){p(f.map(n=>({id:n,label:n}))),a("sapi");return}}catch{}a("none")},v=()=>{d++,b=[],y()?.cancel(),o(!1),t.stop().catch(()=>{})},$=async m=>{const f=de(m,i.value.skipCode);if(!f)return!1;if(v(),await S(),r()==="web"){const n=y();if(!n)return!1;const h=E(),A=i.value.rate,L=d;b=pe(f),o(!0);const P=()=>{if(L!==d)return;const V=b.shift();if(!V){o(!1);return}const T=new SpeechSynthesisUtterance(V);h&&(T.voice=h),h?.lang&&(T.lang=h.lang),T.rate=A,T.onend=P,T.onerror=P,n.speak(T)};return P(),!0}if(r()==="sapi"){o(!0);try{await t.speak({text:f,rate:i.value.rate,voice:i.value.voiceURI})}catch(n){throw o(!1),n}return!0}throw o(!1),new Error(e.t("read.noVoices"))},N=async()=>{const m=e.sessions.current();if(!m)return"";const n=(await m.server.client.message.list({sessionID:m.id,type:"assistant",order:"desc",limit:1})).data[0];return!n||n.type!=="assistant"?"":n.content.filter(h=>h.type==="text").map(h=>h.text).join(`
`)};return t.on("done",()=>o(!1)),y()?.addEventListener?.("voiceschanged",()=>{S()}),S(),{speaking:l,backend:r,voices:s,refreshVoices:S,lastAssistantText:N,speak:$,cancel:v,preview:()=>$(e.t("speech.preview.text"))}}const ge=["es-ES","es-MX","es-AR","es-CO","pt-BR","pt-PT","en-US","en-GB","fr-FR","de-DE","it-IT"];function he(e){const t=w.usePlugin(),i=t.ui,l=t.stores.prefs,o=t.stores.speech,s=t.stores.engine,p=t.main(z),r=t.main(O),[a,d]=C.createSignal([]),[b,y]=C.createSignal(!1);C.onMount(()=>{p.diagnose().then(n=>{n.locales.length>0&&d(n.locales)}).catch(()=>{}),e.speaker.refreshVoices()});const E=()=>{const n=a(),h=l.value.locale;return(n.includes(h)?n:[h,...n]).map(L=>({value:L,label:L}))},S=()=>[{value:"",label:t.t("speech.voice.auto")},...e.speaker.voices().map(n=>({value:n.id,label:n.label}))],v=n=>{l.update(h=>{n.locale!==void 0&&(h.locale=n.locale),n.minConfidence!==void 0&&(h.minConfidence=n.minConfidence),n.trailingSpace!==void 0&&(h.trailingSpace=n.trailingSpace),n.autoFocus!==void 0&&(h.autoFocus=n.autoFocus)})},$=n=>{o.update(h=>{n.voiceURI!==void 0&&(h.voiceURI=n.voiceURI),n.rate!==void 0&&(h.rate=n.rate),n.skipCode!==void 0&&(h.skipCode=n.skipCode)})},N=n=>{s.update(h=>{h.mode=n})},u=async()=>{try{await r.toggle(),t.toast.show({variant:"default",title:t.t("settings.winh"),description:t.t("settings.winh.sent")})}catch(n){t.toast.show({variant:"error",title:t.t("pill.title"),description:n instanceof Error?n.message:t.t("error.winh")})}},m=async()=>{try{await e.speaker.preview()}catch(n){t.toast.show({variant:"error",title:t.t("read.title"),description:n instanceof Error?n.message:t.t("read.error")})}},f=async()=>{y(!0);try{const n=await p.diagnose();if(n.locales.length===0){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-recognizers")}),persistent:!0});return}if(!n.microphone){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-microphone")}),persistent:!0});return}n.locales.length>0&&!a().length&&d(n.locales),t.toast.show({variant:"success",title:t.t("error.title"),description:t.t("settings.test.success",{locale:n.selected||n.locales[0]||l.value.locale})})}catch(n){t.toast.show({variant:"error",title:t.t("error.title"),description:n instanceof Error?n.message:String(n)})}finally{y(!1)}};return g.createComponent(i.SettingsLayout,{get title(){return t.t("settings.title")},get description(){return t.t("settings.description")},get children(){return[g.createComponent(i.SettingsSection,{get title(){return t.t("settings.section")},get children(){return[g.createComponent(i.SettingsRow,{id:"engine",get title(){return t.t("settings.engine")},get description(){return t.t("settings.engine.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.engine")},get value(){return s.value.mode},get options(){return[{value:"windows",label:t.t("engine.windows")},{value:"system",label:t.t("engine.system")}]},onChange:n=>N(n)})}}),g.createComponent(C.Show,{get when(){return s.value.mode==="windows"},get children(){return g.createComponent(i.SettingsRow,{id:"winh",get title(){return t.t("settings.winh")},get description(){return t.t("settings.winh.description")},get children(){return g.createComponent(i.Button,{onClick:()=>{u()},get children(){return t.t("settings.winh.run")}})}})}}),g.createComponent(C.Show,{get when(){return s.value.mode==="system"},get children(){return[g.createComponent(i.SettingsRow,{id:"language",get title(){return t.t("settings.language")},get description(){return t.t("settings.language.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.language")},get value(){return l.value.locale},get options(){return g.memo(()=>E().length>0)()?E():ge.map(n=>({value:n,label:n}))},onChange:n=>v({locale:n})})}}),g.createComponent(i.SettingsRow,{id:"confidence",get title(){return t.t("settings.confidence")},get description(){return t.t("settings.confidence.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.confidence")},get value(){return String(l.value.minConfidence)},get options(){return[{value:"0.2",label:t.t("confidence.low")},{value:"0.4",label:t.t("confidence.normal")},{value:"0.6",label:t.t("confidence.high")}]},onChange:n=>v({minConfidence:Number(n)||.4})})}}),g.createComponent(i.SettingsRow,{id:"space",get title(){return t.t("settings.space")},get description(){return t.t("settings.space.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("settings.space")},hideLabel:!0,get checked(){return l.value.trailingSpace},onChange:n=>v({trailingSpace:n})})}}),g.createComponent(i.SettingsRow,{id:"focus",get title(){return t.t("settings.focus")},get description(){return t.t("settings.focus.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("settings.focus")},hideLabel:!0,get checked(){return l.value.autoFocus},onChange:n=>v({autoFocus:n})})}})]}})]}}),g.createComponent(i.SettingsSection,{get title(){return t.t("speech.section")},get children(){return[g.createComponent(i.SettingsRow,{id:"voice",get title(){return t.t("speech.voice")},get description(){return t.t("speech.voice.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("speech.voice")},get value(){return o.value.voiceURI},get options(){return S()},onChange:n=>$({voiceURI:n})})}}),g.createComponent(i.SettingsRow,{id:"rate",get title(){return t.t("speech.rate")},get description(){return t.t("speech.rate.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("speech.rate")},get value(){return String(o.value.rate)},get options(){return[{value:"0.8",label:t.t("speech.rate.slow")},{value:"1",label:t.t("speech.rate.normal")},{value:"1.2",label:t.t("speech.rate.fast")},{value:"1.5",label:t.t("speech.rate.faster")}]},onChange:n=>$({rate:Number(n)||1})})}}),g.createComponent(i.SettingsRow,{id:"skip-code",get title(){return t.t("speech.skipCode")},get description(){return t.t("speech.skipCode.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("speech.skipCode")},hideLabel:!0,get checked(){return o.value.skipCode},onChange:n=>$({skipCode:n})})}}),g.createComponent(i.SettingsRow,{id:"preview",get title(){return t.t("speech.preview")},get description(){return t.t("speech.preview.description")},get children(){return g.createComponent(i.Button,{onClick:()=>{m()},get children(){return t.t("read.idle")}})}})]}}),g.createComponent(i.SettingsSection,{get title(){return t.t("settings.test.section")},get children(){return g.createComponent(i.SettingsRow,{id:"test",get title(){return t.t("settings.test")},get description(){return t.t("settings.test.description")},get children(){return g.createComponent(i.Button,{get busy(){return b()},onClick:()=>{f()},get children(){return t.t("settings.test.run")}})}})}})]}})}const me=e=>{const t=e.main(z),i=e.main(U),l=e.main(O),o=ue(e,i),s=e.stores.prefs,p=e.stores.engine,[r,a]=C.createSignal(!1);let d;const b=(u,m,f)=>{switch(u){case"LANGUAGE_NOT_AVAILABLE":return e.t("error.language",{locale:m||s.value.locale,available:f.length>0?f.join(", "):"—"});case"NO_RECOGNIZERS":return e.t("error.none");case"MICROPHONE_UNAVAILABLE":return e.t("error.mic");case"SYSTEM_SPEECH_UNAVAILABLE":return e.t("error.system");case"ENGINE_EXIT":return e.t("error.exit");default:return e.t("error.unknown",{code:u})}},y=()=>{r()&&(a(!1),l.toggle().catch(()=>{})),o.cancel(),d=e.sessions.current()?.key,t.start({locale:s.value.locale,minConfidence:s.value.minConfidence}).catch(u=>{e.toast.show({variant:"error",title:e.t("error.title"),description:u instanceof Error?u.message:String(u)})})},E=()=>{t.stop().catch(()=>{})},S=()=>{o.cancel(),e.screen.current()?.composer.focus(),l.toggle().then(()=>a(u=>!u)).catch(u=>{a(!1),e.toast.show({variant:"error",title:e.t("pill.title"),description:u instanceof Error?`${e.t("error.winh")} ${u.message}`:e.t("error.winh")})})},v=()=>{if(p.value.mode==="windows"){S();return}const u=t.state()?.status??"idle";u==="starting"||u==="listening"?E():y()},$=()=>{if(o.speaking()){o.cancel();return}if(!e.sessions.current()){e.toast.show({variant:"error",title:e.t("read.title"),description:e.t("read.noSession")});return}const u=t.state()?.status??"idle";(u==="starting"||u==="listening")&&t.stop().catch(()=>{}),(async()=>{try{const m=await o.lastAssistantText();if(!m.trim()){e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")});return}await o.speak(m)||e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")})}catch(m){e.toast.show({variant:"error",title:e.t("read.title"),description:m instanceof Error?m.message:e.t("read.error")})}})()};t.on("final",u=>{const m=e.sessions.current()?.key;if(d&&m&&m!==d){e.toast.show({variant:"error",title:e.t("error.title"),description:e.t("toast.discarded")});return}const f=e.screen.current()?.composer;if(!f)return;const n=f.text(),h=s.value.trailingSpace&&n.length>0&&!/\s$/.test(n)?" ":"";f.insert(h+u.text),s.value.autoFocus&&f.focus()}),t.on("error",u=>{e.toast.show({variant:"error",title:e.t("error.title"),description:b(u.code,u.detail,u.available),persistent:u.code==="LANGUAGE_NOT_AVAILABLE"||u.code==="NO_RECOGNIZERS",duration:8e3})});const N=()=>{if(e.app.platform!=="desktop")return;if(p.value.mode==="windows")return r()?{label:e.t("pill.dictating"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:v}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.winH"),run:v};const u=t.state()?.status??"idle";return u==="starting"?{label:e.t("pill.starting"),icon:"outline-wave-audio",title:e.t("pill.title"),run:v}:u==="listening"?{label:e.t("pill.listening"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:v}:u==="error"?{label:e.t("pill.error"),icon:"outline-wave-audio",tone:"warning",title:e.t("pill.title"),run:v}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.title"),run:v}};e.add(w.ComposerPill,()=>({id:"dictate",show:()=>N()})),e.add(w.ComposerPill,()=>({id:"read",order:1,show:()=>{if(e.app.platform==="desktop")return o.speaking()?{label:e.t("read.speaking"),icon:"outline-audio",tone:"success",title:e.t("read.stop"),run:$}:{label:e.t("read.idle"),icon:"outline-audio",title:e.t("read.title"),run:$}}})),e.add(w.Command,()=>({id:"toggle",title:e.t("command.toggle"),description:e.t("command.toggle.description"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+m",slash:{name:"dictado"},editable:!0,enabled:e.app.platform==="desktop",run:v})),e.add(w.Command,()=>({id:"configure",title:e.t("command.configure"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),enabled:e.app.platform==="desktop",run:()=>e.layout.settings(e.id)})),e.add(w.Command,()=>({id:"read",title:e.t("command.read"),description:e.t("command.read.description"),keywords:"read aloud speech voice leer voz altavoz lectura",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+l",slash:{name:"leer"},editable:!0,enabled:e.app.platform==="desktop",run:$})),e.add(w.SettingsPage,{id:e.id,icon:"outline-audio",get title(){return e.t("settings.title")},get entries(){return[{id:"engine",title:e.t("settings.engine"),keywords:"engine motor dictation dictado winh voz"},{id:"winh",title:e.t("settings.winh"),keywords:"winh windows voice typing dictado"},{id:"language",title:e.t("settings.language"),keywords:"voice language idioma voz"},{id:"confidence",title:e.t("settings.confidence"),keywords:"voice confidence confianza"},{id:"test",title:e.t("settings.test"),keywords:"voice microphone microphone test microfono"},{id:"voice",title:e.t("speech.voice"),keywords:"read aloud voice voz lectura altavoz"},{id:"rate",title:e.t("speech.rate"),keywords:"read aloud speed velocidad lectura"},{id:"skip-code",title:e.t("speech.skipCode"),keywords:"read aloud code codigo lectura"},{id:"preview",title:e.t("speech.preview"),keywords:"read aloud test voice probar voz"}]},render:()=>g.createComponent(he,{speaker:o})})},fe=w.Plugin.define({...X,setup:me,main:ce});exports.default=fe;
