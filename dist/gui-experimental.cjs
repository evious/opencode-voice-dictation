"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const S=require("@opencode/plugin/gui"),d=require("effect"),z=require("node:child_process"),V=require("node:crypto"),A=require("node:fs"),D=require("node:os"),L=require("node:path"),g=require("solid-js/web"),T=require("solid-js"),ne=S.Plugin.define({os:["windows"],stores:{prefs:S.Store.global(d.Schema.Struct({locale:d.Schema.String,minConfidence:d.Schema.Number,trailingSpace:d.Schema.Boolean,autoFocus:d.Schema.Boolean}),{locale:"es-ES",minConfidence:.4,trailingSpace:!0,autoFocus:!0}),speech:S.Store.global(d.Schema.Struct({voiceURI:d.Schema.String,rate:d.Schema.Number,skipCode:d.Schema.Boolean}),{voiceURI:"",rate:1,skipCode:!0}),engine:S.Store.global(d.Schema.Struct({mode:d.Schema.String}),{mode:"windows"})},i18n:{en:{"pill.idle":"Dictate","pill.starting":"Starting…","pill.listening":"Listening…","pill.dictating":"Dictating…","pill.error":"Retry dictation","pill.title":"Voice dictation","pill.winH":"Open Windows voice typing (Win+H)","pill.stop":"Stop dictation","command.toggle":"Toggle voice dictation","command.toggle.description":"Dictate into the prompt with the selected engine","command.configure":"Voice dictation settings","error.title":"Voice dictation","error.language":"The speech language {locale} is not installed. Available: {available}.","error.none":"Windows has no speech recognizer installed. Settings › Time & language › Language › Speech.","error.mic":"No microphone is available for speech recognition.","error.system":"System.Speech is not available in this Windows installation.","error.exit":"The dictation engine stopped unexpectedly.","error.unknown":"Dictation failed ({code}).","toast.discarded":"Dictation discarded: the active session changed.","settings.title":"Voice dictation","settings.description":"Offline dictation with the Windows speech recognizer. The text is inserted into the prompt; it is never sent automatically.","settings.section":"Dictation","settings.engine":"Dictation engine","settings.engine.description":"Windows uses Windows 11 voice typing (Win+H), which is more accurate. System.Speech works offline but is less precise.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Test Win+H","settings.winh.description":"Sends the Windows voice typing shortcut. If the floating bar appears, it works.","settings.winh.run":"Test Win+H","settings.winh.sent":"Win+H sent. If the Windows dictation bar did not appear, check Settings › Accessibility › Voice typing.","error.winh":"Windows voice typing could not be triggered.","settings.language":"Language","settings.language.description":"A speech recognizer installed in Windows. Accents and punctuation depend on it.","settings.confidence":"Minimum confidence","settings.confidence.description":"Results below this threshold are ignored to avoid noise.","confidence.low":"Low (0.2)","confidence.normal":"Normal (0.4)","confidence.high":"High (0.6)","settings.space":"Add a space before the text","settings.space.description":"Separates the dictation from what is already in the prompt.","settings.focus":"Focus the prompt after dictating","settings.focus.description":"Moves the cursor to the prompt so you can review or send it.","settings.test.section":"Diagnostics","settings.test":"Test microphone","settings.test.description":"Checks installed recognizers and the default microphone.","settings.test.run":"Run test","settings.test.success":"Speech recognition ready: {locale}","settings.test.failed":"Not ready: {reason}","common.reason.no-recognizers":"no speech language installed","common.reason.no-microphone":"no microphone available","read.idle":"Read","read.speaking":"Reading…","read.paused":"Paused","read.pause":"Pause","read.resume":"Resume","read.restart":"Read again","read.stop":"Stop reading","read.title":"Read the last message aloud","command.read":"Read the last message aloud","command.read.description":"Speaks the last reply with a system voice","read.noSession":"Open a conversation to read its last message.","read.empty":"The last message has no text to read.","read.error":"The last message could not be read.","read.noVoices":"Windows has no voices installed for reading.","speech.section":"Read aloud","speech.voice":"Voice","speech.voice.description":"A system voice. Automatic picks one in the app language.","speech.voice.auto":"Automatic","speech.rate":"Speed","speech.rate.description":"How fast the text is spoken.","speech.rate.slow":"0.8×","speech.rate.normal":"1×","speech.rate.fast":"1.2×","speech.rate.faster":"1.5×","speech.skipCode":"Skip code blocks","speech.skipCode.description":"Read only the prose; code, paths and commands are left out.","speech.preview":"Test voice","speech.preview.description":"Speaks a short sample with the current voice and speed.","speech.preview.text":"Hello, this is a reading test."},es:{"pill.idle":"Dictar","pill.starting":"Iniciando…","pill.listening":"Escuchando…","pill.dictating":"Dictando…","pill.error":"Reintentar dictado","pill.title":"Dictado por voz","pill.winH":"Abrir el dictado de Windows (Win+H)","pill.stop":"Detener dictado","command.toggle":"Alternar dictado por voz","command.toggle.description":"Dicta en el prompt con el motor elegido","command.configure":"Ajustes de dictado por voz","error.title":"Dictado por voz","error.language":"El idioma de reconocimiento {locale} no está instalado. Disponibles: {available}.","error.none":"Windows no tiene ningún reconocedor de voz instalado. Configuración › Hora e idioma › Idioma › Voz.","error.mic":"No hay ningún micrófono disponible para el reconocimiento de voz.","error.system":"System.Speech no está disponible en esta instalación de Windows.","error.exit":"El motor de dictado se detuvo inesperadamente.","error.unknown":"El dictado falló ({code}).","toast.discarded":"Dictado descartado: la sesión activa cambió.","settings.title":"Dictado por voz","settings.description":"Dictado offline con el reconocedor de voz de Windows. El texto se inserta en el prompt; nunca se envía solo.","settings.section":"Dictado","settings.engine":"Motor de dictado","settings.engine.description":"Windows usa el dictado de Windows 11 (Win+H), más preciso. System.Speech funciona sin Windows 11 pero es menos exacto.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Probar Win+H","settings.winh.description":"Envía el atajo del dictado de Windows. Si aparece la barra flotante, funciona.","settings.winh.run":"Probar Win+H","settings.winh.sent":"Win+H enviado. Si no apareció la barra, revisa Configuración › Accesibilidad › Dictado por voz.","settings.language":"Idioma","settings.language.description":"Un reconocedor instalado en Windows. Los acentos y la puntuación dependen de él.","settings.confidence":"Confianza mínima","settings.confidence.description":"Los resultados por debajo de este umbral se ignoran para evitar ruido.","confidence.low":"Baja (0,2)","confidence.normal":"Normal (0,4)","confidence.high":"Alta (0,6)","settings.space":"Añadir un espacio antes del texto","settings.space.description":"Separa el dictado de lo que ya hay en el prompt.","settings.focus":"Enfocar el prompt al terminar","settings.focus.description":"Mueve el cursor al prompt para revisar o enviar el texto.","settings.test.section":"Diagnóstico","settings.test":"Probar micrófono","settings.test.description":"Comprueba los reconocedores instalados y el micrófono predeterminado.","settings.test.run":"Ejecutar prueba","settings.test.success":"Reconocimiento de voz listo: {locale}","settings.test.failed":"No está listo: {reason}","common.reason.no-recognizers":"no hay ningún idioma de voz instalado","common.reason.no-microphone":"no hay micrófono disponible","read.idle":"Leer","read.speaking":"Leyendo…","read.paused":"Pausado","read.pause":"Pausar","read.resume":"Reanudar","read.restart":"Leer de nuevo","read.stop":"Detener lectura","read.title":"Leer en voz alta el último mensaje","command.read":"Leer en voz alta el último mensaje","command.read.description":"Reproduce la última respuesta con una voz del sistema","read.noSession":"Abre una conversación para leer su último mensaje.","read.empty":"El último mensaje no tiene texto para leer.","read.error":"No se pudo leer el último mensaje.","read.noVoices":"Windows no tiene voces instaladas para la lectura.","speech.section":"Lectura en voz alta","speech.voice":"Voz","speech.voice.description":"Una voz del sistema. Automática elige una en el idioma de la app.","speech.voice.auto":"Automática","speech.rate":"Velocidad","speech.rate.description":"A qué ritmo se lee el texto.","speech.rate.slow":"0,8×","speech.rate.normal":"1×","speech.rate.fast":"1,2×","speech.rate.faster":"1,5×","speech.skipCode":"Ignorar bloques de código","speech.skipCode.description":"Lee solo la prosa; omite código, rutas y comandos.","speech.preview":"Probar voz","speech.preview.description":"Lee una frase corta con la voz y velocidad actuales.","speech.preview.text":"Hola, esta es una prueba de lectura."}}}),H=S.Ipc.define({id:"voice-dictation.dictation",state:d.Schema.Struct({status:d.Schema.Literals(["idle","starting","listening","error"]),error:d.Schema.String,locale:d.Schema.String}),methods:{start:{input:d.Schema.Struct({locale:d.Schema.String,minConfidence:d.Schema.Number})},stop:{},diagnose:{output:d.Schema.Struct({locales:d.Schema.Array(d.Schema.String),microphone:d.Schema.Boolean,selected:d.Schema.String,error:d.Schema.String})}},events:{final:d.Schema.Struct({text:d.Schema.String,confidence:d.Schema.Number}),error:d.Schema.Struct({code:d.Schema.String,detail:d.Schema.String,available:d.Schema.Array(d.Schema.String)})}}),q=S.Ipc.define({id:"voice-dictation.speech",methods:{speak:{input:d.Schema.Struct({text:d.Schema.String,rate:d.Schema.Number,voice:d.Schema.String})},stop:{},voices:{output:d.Schema.Array(d.Schema.String)}},events:{done:d.Schema.Struct({ok:d.Schema.Boolean})}}),U=S.Ipc.define({id:"voice-dictation.voice-typing",methods:{toggle:{}}}),j=String.raw`param(
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
`,ie="powershell.exe";function K(){const e=L.join(D.tmpdir(),"opencode-voice-dictation");A.mkdirSync(e,{recursive:!0});const t=V.createHash("sha1").update(j).digest("hex").slice(0,12),n=L.join(e,`dictation-${t}.ps1`);return A.writeFileSync(n,j,"utf8"),n}function Z(e){return z.spawn(ie,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function X(e){const t=e.pid;if(t===void 0){e.kill();return}z.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function oe(e,t){const n=Z(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",K(),"-Culture",e.locale,"-MinConfidence",String(e.minConfidence)]);let l=!1,o="",r="";const u=s=>{switch(s.type){case"ready":t.onReady(s.locale??e.locale);break;case"final":s.text&&t.onFinal(s.text,s.confidence??0);break;case"error":t.onError(s.code??"UNKNOWN",s.detail??"",s.available??[]);break}};return n.stdout?.setEncoding("utf8"),n.stdout?.on("data",s=>{r+=s;let a=r.indexOf(`
`);for(;a>=0;){const p=r.slice(0,a).replace(/\r$/,"").trim();if(r=r.slice(a+1),p)try{u(JSON.parse(p))}catch{}a=r.indexOf(`
`)}}),n.stderr?.setEncoding("utf8"),n.stderr?.on("data",s=>{o=(o+s).slice(-2e3)}),n.on("error",s=>{l||t.onError("ENGINE_START_FAILED",s.message,[])}),n.on("close",s=>{l||t.onExit(s,o.trim().slice(-500))}),{stop(){l=!0,X(n)}}}function re(){return new Promise((e,t)=>{const n=Z(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",K(),"-Diagnose"]);let l="",o="",r=!1;const u=(a,p)=>{r||(r=!0,clearTimeout(s),a?t(a):e(p))},s=setTimeout(()=>{X(n),u(new Error("diagnose timed out"))},2e4);n.stdout?.setEncoding("utf8"),n.stdout?.on("data",a=>{l+=a}),n.stderr?.setEncoding("utf8"),n.stderr?.on("data",a=>{o+=a}),n.on("error",a=>u(a)),n.on("close",()=>{const a=l.split(/\r?\n/).map(p=>p.trim()).filter(p=>p.startsWith("{")).at(-1);if(!a){u(new Error(o.trim()||"no output from PowerShell"));return}try{const p=JSON.parse(a);u(void 0,{locales:p.locales??[],microphone:p.microphone===!0,selected:p.selected??"",error:p.error??""})}catch(p){u(p instanceof Error?p:new Error(String(p)))}})})}const M=String.raw`param(
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
`,se="powershell.exe";function Y(){const e=L.join(D.tmpdir(),"opencode-voice-dictation");return A.mkdirSync(e,{recursive:!0}),e}function J(){const e=V.createHash("sha1").update(M).digest("hex").slice(0,12),t=L.join(Y(),`speak-${e}.ps1`);return A.writeFileSync(t,M,"utf8"),t}function ae(e){const t=L.join(Y(),`speech-${V.randomUUID()}.txt`);return A.writeFileSync(t,e,"utf8"),t}function Q(e){return z.spawn(se,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function x(e){const t=e.pid;if(t===void 0){e.kill();return}z.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function ce(e){return Math.max(-10,Math.min(10,Math.round((e-1)*5)))}function le(e,t){const n=ae(e.text),l=Q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",J(),"-TextFile",n,"-Rate",String(ce(e.rate)),"-Voice",e.voice]);let o=!1;const r=()=>{try{A.rmSync(n,{force:!0})}catch{}};return l.on("error",()=>{r(),o||t(!1)}),l.on("close",u=>{r(),o||t(u===0)}),{stop(){o=!0,x(l),r()}}}function de(){return new Promise(e=>{const t=Q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",J(),"-ListVoices"]);let n="",l=!1;const o=u=>{l||(l=!0,clearTimeout(r),e(u))},r=setTimeout(()=>{x(t),o([])},1e4);t.stdout?.setEncoding("utf8"),t.stdout?.on("data",u=>{n+=u}),t.on("error",()=>o([])),t.on("close",()=>{const u=n.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length>0);o(u)})})}const G=String.raw`$ErrorActionPreference = "Stop"

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
`,pe="powershell.exe";function ue(){const e=L.join(D.tmpdir(),"opencode-voice-dictation");A.mkdirSync(e,{recursive:!0});const t=V.createHash("sha1").update(G).digest("hex").slice(0,12),n=L.join(e,`win-h-${t}.ps1`);return A.writeFileSync(n,G,"utf8"),n}function ge(e){return z.spawn(pe,e,{windowsHide:!0,stdio:"ignore"})}function me(){return new Promise((e,t)=>{const n=ge(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",ue()]);n.on("error",l=>t(l)),n.on("close",l=>{l===0?e():t(new Error(`Win+H helper exited with code ${l??"unknown"}`))})})}const he=e=>{let t="idle",n="",l="",o,r=!1;const u=()=>{o=void 0,r=!1},s=e.provide(H,{state:()=>({status:t,error:n,locale:l}),start(y,E){o&&(r=!0,o.stop(),u()),t="starting",n="",l=y.locale,s.changed();const C=E.window;try{o=oe({locale:y.locale,minConfidence:y.minConfidence},{onReady(f){t="listening",l=f,s.changed()},onFinal(f,h){s.emit("final",{text:f,confidence:h},C)},onError(f,h,k){t="error",n=f,s.changed(),s.emit("error",{code:f,detail:h,available:k},C)},onExit(f,h){if(r){u(),t="idle",n="",l="",s.changed();return}u(),t!=="error"&&(t="error",n=f===null?"ENGINE_EXIT":`ENGINE_EXIT_${f}`,s.changed(),s.emit("error",{code:"ENGINE_EXIT",detail:h||(f===null?"":String(f)),available:[]},C))}})}catch(f){throw t="error",n="ENGINE_START_FAILED",s.changed(),f}},stop(){o&&(r=!0,o.stop(),u()),t="idle",n="",l="",s.changed()},diagnose(){return re()}});let a;const p=e.provide(q,{speak(y){a?.stop(),a=le(y,E=>{a=void 0,p.emit("done",{ok:E})})},stop(){a&&(a.stop(),a=void 0)},voices(){return de()}});e.provide(U,{toggle(){return me()}}),e.onCleanup(()=>{o&&(r=!0,o.stop(),u()),a?.stop(),a=void 0})},fe=250;function Se(e,t){let n=e.replace(/\r\n/g,`
`);return t?n=n.replace(/```[\s\S]*?```/g," "):n=n.replace(/```[^\n]*\n([\s\S]*?)```/g,"$1"),n=n.replace(/`([^`]+)`/g,"$1"),n=n.replace(/!\[[^\]]*\]\([^)]*\)/g," "),n=n.replace(/\[([^\]]+)\]\([^)]*\)/g,"$1"),n=n.replace(/^\s*#{1,6}\s+/gm,""),n=n.replace(/^\s*>\s?/gm,""),n=n.replace(/^\s*[-*+]\s+/gm,""),n=n.replace(/^\s*\d+\.\s+/gm,""),n=n.replace(/(\*\*|__)(.*?)\1/g,"$2"),n=n.replace(/(\*|_)(.*?)\1/g,"$2"),n=n.replace(/^\s*\|.*\|\s*$/gm," "),n=n.replace(/\n{2,}/g,". "),n=n.replace(/\n/g," "),n=n.replace(/\s+/g," "),n=n.replace(/\s+([.,;:!?])/g,"$1"),n=n.replace(/([.,;:!?]){2,}/g,"$1"),n.trim()}function ve(e,t=fe){const n=e.trim();if(!n)return[];const l=n.split(new RegExp("(?<=[.!?…])\\s+")),o=[];let r="";const u=s=>{let a="";for(const p of s.split(/\s+/))p&&(a&&a.length+1+p.length>t?(o.push(a),a=p):a=a?`${a} ${p}`:p);return a};for(const s of l){if(s.length>t){r&&(o.push(r),r=""),r=u(s);continue}r&&r.length+1+s.length>t?(o.push(r),r=s):r=r?`${r} ${s}`:s}return r&&o.push(r),o}function we(e,t){const n=e.stores.speech,[l,o]=T.createSignal(!1),[r,u]=T.createSignal(!1),[s,a]=T.createSignal([]),[p,y]=T.createSignal("none");let E=0,C=[],f="";const h=()=>typeof globalThis.speechSynthesis<"u"?globalThis.speechSynthesis:void 0,k=()=>{const v=h()?.getVoices()??[];if(v.length===0)return;const w=n.value.voiceURI;if(w){const $=v.find(O=>O.voiceURI===w);if($)return $}const b=e.locale.locale().split("-")[0]?.toLowerCase()??"es";return v.find($=>$.lang.toLowerCase().startsWith(b))??v[0]},R=async()=>{const v=h()?.getVoices()??[];if(v.length>0){a(v.map(w=>({id:w.voiceURI,label:`${w.name} — ${w.lang}`}))),y("web");return}try{const w=await t.voices();if(w.length>0){a(w.map(b=>({id:b,label:b}))),y("sapi");return}}catch{}y("none")},_=()=>{E++,C=[],h()?.cancel(),u(!1),o(!1),p()==="sapi"&&t.stop().catch(()=>{})},P=()=>p()==="web",c=()=>{!l()||r()||!P()||(h()?.pause(),u(!0))},i=()=>{!l()||!r()||!P()||(h()?.resume(),u(!1))},m=()=>{r()?i():c()},I=()=>f?N(f):Promise.resolve(!1),N=async v=>{f=v;const w=Se(v,n.value.skipCode);if(!w)return!1;if(_(),await R(),p()==="web"){const b=h();if(!b)return!1;const $=k(),O=n.value.rate,te=E;C=ve(w),o(!0),u(!1);const F=()=>{if(te!==E)return;const B=C.shift();if(!B){u(!1),o(!1);return}const W=new SpeechSynthesisUtterance(B);$&&(W.voice=$),$?.lang&&(W.lang=$.lang),W.rate=O,W.onend=F,W.onerror=F,b.speak(W)};return F(),!0}if(p()==="sapi"){o(!0),u(!1);try{await t.speak({text:w,rate:n.value.rate,voice:n.value.voiceURI})}catch(b){throw o(!1),b}return!0}throw o(!1),new Error(e.t("read.noVoices"))},ee=async()=>{const v=e.sessions.current();if(!v)return"";const b=(await v.server.client.message.list({sessionID:v.id,type:"assistant",order:"desc",limit:1})).data[0];return!b||b.type!=="assistant"?"":b.content.filter($=>$.type==="text").map($=>$.text).join(`
`)};return t.on("done",()=>{u(!1),o(!1)}),h()?.addEventListener?.("voiceschanged",()=>{R()}),R(),{speaking:l,paused:r,backend:p,canPause:P,voices:s,refreshVoices:R,lastAssistantText:ee,speak:N,cancel:_,pause:c,resume:i,togglePause:m,restart:I,preview:()=>N(e.t("speech.preview.text"))}}const ye=["es-ES","es-MX","es-AR","es-CO","pt-BR","pt-PT","en-US","en-GB","fr-FR","de-DE","it-IT"];function be(e){const t=S.usePlugin(),n=t.ui,l=t.stores.prefs,o=t.stores.speech,r=t.stores.engine,u=t.main(H),s=t.main(U),[a,p]=T.createSignal([]),[y,E]=T.createSignal(!1);T.onMount(()=>{u.diagnose().then(i=>{i.locales.length>0&&p(i.locales)}).catch(()=>{}),e.speaker.refreshVoices()});const C=()=>{const i=a(),m=l.value.locale;return(i.includes(m)?i:[m,...i]).map(N=>({value:N,label:N}))},f=()=>[{value:"",label:t.t("speech.voice.auto")},...e.speaker.voices().map(i=>({value:i.id,label:i.label}))],h=i=>{l.update(m=>{i.locale!==void 0&&(m.locale=i.locale),i.minConfidence!==void 0&&(m.minConfidence=i.minConfidence),i.trailingSpace!==void 0&&(m.trailingSpace=i.trailingSpace),i.autoFocus!==void 0&&(m.autoFocus=i.autoFocus)})},k=i=>{o.update(m=>{i.voiceURI!==void 0&&(m.voiceURI=i.voiceURI),i.rate!==void 0&&(m.rate=i.rate),i.skipCode!==void 0&&(m.skipCode=i.skipCode)})},R=i=>{r.update(m=>{m.mode=i})},_=async()=>{try{await s.toggle(),t.toast.show({variant:"default",title:t.t("settings.winh"),description:t.t("settings.winh.sent")})}catch(i){t.toast.show({variant:"error",title:t.t("pill.title"),description:i instanceof Error?i.message:t.t("error.winh")})}},P=async()=>{try{await e.speaker.preview()}catch(i){t.toast.show({variant:"error",title:t.t("read.title"),description:i instanceof Error?i.message:t.t("read.error")})}},c=async()=>{E(!0);try{const i=await u.diagnose();if(i.locales.length===0){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-recognizers")}),persistent:!0});return}if(!i.microphone){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-microphone")}),persistent:!0});return}i.locales.length>0&&!a().length&&p(i.locales),t.toast.show({variant:"success",title:t.t("error.title"),description:t.t("settings.test.success",{locale:i.selected||i.locales[0]||l.value.locale})})}catch(i){t.toast.show({variant:"error",title:t.t("error.title"),description:i instanceof Error?i.message:String(i)})}finally{E(!1)}};return g.createComponent(n.SettingsLayout,{get title(){return t.t("settings.title")},get description(){return t.t("settings.description")},get children(){return[g.createComponent(n.SettingsSection,{get title(){return t.t("settings.section")},get children(){return[g.createComponent(n.SettingsRow,{id:"engine",get title(){return t.t("settings.engine")},get description(){return t.t("settings.engine.description")},get children(){return g.createComponent(n.Select,{get label(){return t.t("settings.engine")},get value(){return r.value.mode},get options(){return[{value:"windows",label:t.t("engine.windows")},{value:"system",label:t.t("engine.system")}]},onChange:i=>R(i)})}}),g.createComponent(T.Show,{get when(){return r.value.mode==="windows"},get children(){return g.createComponent(n.SettingsRow,{id:"winh",get title(){return t.t("settings.winh")},get description(){return t.t("settings.winh.description")},get children(){return g.createComponent(n.Button,{onClick:()=>{_()},get children(){return t.t("settings.winh.run")}})}})}}),g.createComponent(T.Show,{get when(){return r.value.mode==="system"},get children(){return[g.createComponent(n.SettingsRow,{id:"language",get title(){return t.t("settings.language")},get description(){return t.t("settings.language.description")},get children(){return g.createComponent(n.Select,{get label(){return t.t("settings.language")},get value(){return l.value.locale},get options(){return g.memo(()=>C().length>0)()?C():ye.map(i=>({value:i,label:i}))},onChange:i=>h({locale:i})})}}),g.createComponent(n.SettingsRow,{id:"confidence",get title(){return t.t("settings.confidence")},get description(){return t.t("settings.confidence.description")},get children(){return g.createComponent(n.Select,{get label(){return t.t("settings.confidence")},get value(){return String(l.value.minConfidence)},get options(){return[{value:"0.2",label:t.t("confidence.low")},{value:"0.4",label:t.t("confidence.normal")},{value:"0.6",label:t.t("confidence.high")}]},onChange:i=>h({minConfidence:Number(i)||.4})})}}),g.createComponent(n.SettingsRow,{id:"space",get title(){return t.t("settings.space")},get description(){return t.t("settings.space.description")},get children(){return g.createComponent(n.Switch,{get label(){return t.t("settings.space")},hideLabel:!0,get checked(){return l.value.trailingSpace},onChange:i=>h({trailingSpace:i})})}}),g.createComponent(n.SettingsRow,{id:"focus",get title(){return t.t("settings.focus")},get description(){return t.t("settings.focus.description")},get children(){return g.createComponent(n.Switch,{get label(){return t.t("settings.focus")},hideLabel:!0,get checked(){return l.value.autoFocus},onChange:i=>h({autoFocus:i})})}})]}})]}}),g.createComponent(n.SettingsSection,{get title(){return t.t("speech.section")},get children(){return[g.createComponent(n.SettingsRow,{id:"voice",get title(){return t.t("speech.voice")},get description(){return t.t("speech.voice.description")},get children(){return g.createComponent(n.Select,{get label(){return t.t("speech.voice")},get value(){return o.value.voiceURI},get options(){return f()},onChange:i=>k({voiceURI:i})})}}),g.createComponent(n.SettingsRow,{id:"rate",get title(){return t.t("speech.rate")},get description(){return t.t("speech.rate.description")},get children(){return g.createComponent(n.Select,{get label(){return t.t("speech.rate")},get value(){return String(o.value.rate)},get options(){return[{value:"0.8",label:t.t("speech.rate.slow")},{value:"1",label:t.t("speech.rate.normal")},{value:"1.2",label:t.t("speech.rate.fast")},{value:"1.5",label:t.t("speech.rate.faster")}]},onChange:i=>k({rate:Number(i)||1})})}}),g.createComponent(n.SettingsRow,{id:"skip-code",get title(){return t.t("speech.skipCode")},get description(){return t.t("speech.skipCode.description")},get children(){return g.createComponent(n.Switch,{get label(){return t.t("speech.skipCode")},hideLabel:!0,get checked(){return o.value.skipCode},onChange:i=>k({skipCode:i})})}}),g.createComponent(n.SettingsRow,{id:"preview",get title(){return t.t("speech.preview")},get description(){return t.t("speech.preview.description")},get children(){return g.createComponent(n.Button,{onClick:()=>{P()},get children(){return t.t("read.idle")}})}})]}}),g.createComponent(n.SettingsSection,{get title(){return t.t("settings.test.section")},get children(){return g.createComponent(n.SettingsRow,{id:"test",get title(){return t.t("settings.test")},get description(){return t.t("settings.test.description")},get children(){return g.createComponent(n.Button,{get busy(){return y()},onClick:()=>{c()},get children(){return t.t("settings.test.run")}})}})}})]}})}function $e(e){const t=S.usePlugin();return g.memo(()=>e.actions().map(n=>g.createComponent(t.ui.Button,{get variant(){return n.id==="stop"?"danger":"neutral"},get icon(){return n.icon},onClick:()=>{n.run(),e.close()},get children(){return n.label}})))}const Ee=e=>{const t=e.main(H),n=e.main(q),l=e.main(U),o=we(e,n),r=e.stores.prefs,u=e.stores.engine,[s,a]=T.createSignal(!1);let p;const y=(c,i,m)=>{switch(c){case"LANGUAGE_NOT_AVAILABLE":return e.t("error.language",{locale:i||r.value.locale,available:m.length>0?m.join(", "):"—"});case"NO_RECOGNIZERS":return e.t("error.none");case"MICROPHONE_UNAVAILABLE":return e.t("error.mic");case"SYSTEM_SPEECH_UNAVAILABLE":return e.t("error.system");case"ENGINE_EXIT":return e.t("error.exit");default:return e.t("error.unknown",{code:c})}},E=()=>{s()&&(a(!1),l.toggle().catch(()=>{})),o.cancel(),p=e.sessions.current()?.key,t.start({locale:r.value.locale,minConfidence:r.value.minConfidence}).catch(c=>{e.toast.show({variant:"error",title:e.t("error.title"),description:c instanceof Error?c.message:String(c)})})},C=()=>{t.stop().catch(()=>{})},f=()=>{o.cancel(),e.screen.current()?.composer.focus(),l.toggle().then(()=>a(c=>!c)).catch(c=>{a(!1),e.toast.show({variant:"error",title:e.t("pill.title"),description:c instanceof Error?`${e.t("error.winh")} ${c.message}`:e.t("error.winh")})})},h=()=>{if(u.value.mode==="windows"){f();return}const c=t.state()?.status??"idle";c==="starting"||c==="listening"?C():E()},k=()=>{if(o.speaking()){o.cancel();return}if(!e.sessions.current()){e.toast.show({variant:"error",title:e.t("read.title"),description:e.t("read.noSession")});return}const c=t.state()?.status??"idle";(c==="starting"||c==="listening")&&t.stop().catch(()=>{}),(async()=>{try{const i=await o.lastAssistantText();if(!i.trim()){e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")});return}await o.speak(i)||e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")})}catch(i){e.toast.show({variant:"error",title:e.t("read.title"),description:i instanceof Error?i.message:e.t("read.error")})}})()},R=()=>{if(!o.speaking())return[{id:"start",label:e.t("read.idle"),icon:"outline-audio",run:k}];const c=o.paused(),i=[{id:"restart",label:e.t("read.restart"),icon:"outline-reset",run:()=>{o.restart()}}];return o.canPause()&&i.push({id:"pause",label:c?e.t("read.resume"):e.t("read.pause"),icon:"outline-audio",run:()=>o.togglePause()}),i.push({id:"stop",label:e.t("read.stop"),icon:"xmark-small",run:()=>o.cancel()}),i};t.on("final",c=>{const i=e.sessions.current()?.key;if(p&&i&&i!==p){e.toast.show({variant:"error",title:e.t("error.title"),description:e.t("toast.discarded")});return}const m=e.screen.current()?.composer;if(!m)return;const I=m.text(),N=r.value.trailingSpace&&I.length>0&&!/\s$/.test(I)?" ":"";m.insert(N+c.text),r.value.autoFocus&&m.focus()}),t.on("error",c=>{e.toast.show({variant:"error",title:e.t("error.title"),description:y(c.code,c.detail,c.available),persistent:c.code==="LANGUAGE_NOT_AVAILABLE"||c.code==="NO_RECOGNIZERS",duration:8e3})});const _=()=>{if(e.app.platform!=="desktop")return;if(u.value.mode==="windows")return s()?{label:e.t("pill.dictating"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:h}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.winH"),run:h};const c=t.state()?.status??"idle";return c==="starting"?{label:e.t("pill.starting"),icon:"outline-wave-audio",title:e.t("pill.title"),run:h}:c==="listening"?{label:e.t("pill.listening"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:h}:c==="error"?{label:e.t("pill.error"),icon:"outline-wave-audio",tone:"warning",title:e.t("pill.title"),run:h}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.title"),run:h}},P=()=>{if(e.app.platform!=="desktop")return;const c=o.speaking(),i=o.paused(),m=c?R().map(I=>({id:I.id,label:I.label,icon:I.icon,tone:I.id==="stop"?"danger":void 0,run:I.run})):[];return{label:c?i?e.t("read.paused"):e.t("read.speaking"):e.t("read.idle"),icon:"outline-audio",tone:c?"success":void 0,title:e.t("read.title"),rows:m.length>0?m:void 0,run:c?void 0:k}};e.add(S.ComposerPill,()=>({id:"dictate",show:()=>_()})),e.add(S.ComposerPill,()=>({id:"read",order:1,show:()=>P(),menu:c=>g.createComponent($e,{actions:R,get close(){return c.close}})})),e.add(S.Command,()=>({id:"toggle",title:e.t("command.toggle"),description:e.t("command.toggle.description"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+m",slash:{name:"dictado"},editable:!0,enabled:e.app.platform==="desktop",run:h})),e.add(S.Command,()=>({id:"configure",title:e.t("command.configure"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),enabled:e.app.platform==="desktop",run:()=>e.layout.settings(e.id)})),e.add(S.Command,()=>({id:"read",title:e.t("command.read"),description:e.t("command.read.description"),keywords:"read aloud speech voice leer voz altavoz lectura",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+l",slash:{name:"leer"},editable:!0,enabled:e.app.platform==="desktop",run:k})),e.add(S.SettingsPage,{id:e.id,icon:"outline-audio",get title(){return e.t("settings.title")},get entries(){return[{id:"engine",title:e.t("settings.engine"),keywords:"engine motor dictation dictado winh voz"},{id:"winh",title:e.t("settings.winh"),keywords:"winh windows voice typing dictado"},{id:"language",title:e.t("settings.language"),keywords:"voice language idioma voz"},{id:"confidence",title:e.t("settings.confidence"),keywords:"voice confidence confianza"},{id:"test",title:e.t("settings.test"),keywords:"voice microphone microphone test microfono"},{id:"voice",title:e.t("speech.voice"),keywords:"read aloud voice voz lectura altavoz"},{id:"rate",title:e.t("speech.rate"),keywords:"read aloud speed velocidad lectura"},{id:"skip-code",title:e.t("speech.skipCode"),keywords:"read aloud code codigo lectura"},{id:"preview",title:e.t("speech.preview"),keywords:"read aloud test voice probar voz"}]},render:()=>g.createComponent(be,{speaker:o})})},Ce=S.Plugin.define({...ne,setup:Ee,main:he});exports.default=Ce;
