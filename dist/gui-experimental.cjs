"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const v=require("@opencode/plugin/gui"),l=require("effect"),W=require("node:child_process"),z=require("node:crypto"),A=require("node:fs"),F=require("node:os"),P=require("node:path"),g=require("solid-js/web"),R=require("solid-js"),ie=v.Plugin.define({os:["windows"],stores:{prefs:v.Store.global(l.Schema.Struct({locale:l.Schema.String,minConfidence:l.Schema.Number,trailingSpace:l.Schema.Boolean,autoFocus:l.Schema.Boolean}),{locale:"es-ES",minConfidence:.4,trailingSpace:!0,autoFocus:!0}),speech:v.Store.global(l.Schema.Struct({voiceURI:l.Schema.String,rate:l.Schema.Number,skipCode:l.Schema.Boolean}),{voiceURI:"",rate:1,skipCode:!0}),engine:v.Store.global(l.Schema.Struct({mode:l.Schema.String}),{mode:"windows"})},i18n:{en:{"pill.idle":"Dictate","pill.starting":"Starting…","pill.listening":"Listening…","pill.dictating":"Dictating…","pill.error":"Retry dictation","pill.title":"Voice dictation","pill.winH":"Open Windows voice typing (Win+H)","pill.stop":"Stop dictation","command.toggle":"Toggle voice dictation","command.toggle.description":"Dictate into the prompt with the selected engine","command.configure":"Voice dictation settings","error.title":"Voice dictation","error.language":"The speech language {locale} is not installed. Available: {available}.","error.none":"Windows has no speech recognizer installed. Settings › Time & language › Language › Speech.","error.mic":"No microphone is available for speech recognition.","error.system":"System.Speech is not available in this Windows installation.","error.exit":"The dictation engine stopped unexpectedly.","error.unknown":"Dictation failed ({code}).","toast.discarded":"Dictation discarded: the active session changed.","settings.title":"Voice dictation","settings.description":"Offline dictation with the Windows speech recognizer. The text is inserted into the prompt; it is never sent automatically.","settings.section":"Dictation","settings.engine":"Dictation engine","settings.engine.description":"Windows uses Windows 11 voice typing (Win+H), which is more accurate. System.Speech works offline but is less precise.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Test Win+H","settings.winh.description":"Sends the Windows voice typing shortcut. If the floating bar appears, it works.","settings.winh.run":"Test Win+H","settings.winh.sent":"Win+H sent. If the Windows dictation bar did not appear, check Settings › Accessibility › Voice typing.","error.winh":"Windows voice typing could not be triggered.","settings.language":"Language","settings.language.description":"A speech recognizer installed in Windows. Accents and punctuation depend on it.","settings.confidence":"Minimum confidence","settings.confidence.description":"Results below this threshold are ignored to avoid noise.","confidence.low":"Low (0.2)","confidence.normal":"Normal (0.4)","confidence.high":"High (0.6)","settings.space":"Add a space before the text","settings.space.description":"Separates the dictation from what is already in the prompt.","settings.focus":"Focus the prompt after dictating","settings.focus.description":"Moves the cursor to the prompt so you can review or send it.","settings.test.section":"Diagnostics","settings.test":"Test microphone","settings.test.description":"Checks installed recognizers and the default microphone.","settings.test.run":"Run test","settings.test.success":"Speech recognition ready: {locale}","settings.test.failed":"Not ready: {reason}","common.reason.no-recognizers":"no speech language installed","common.reason.no-microphone":"no microphone available","read.idle":"Read","read.speaking":"Reading…","read.paused":"Paused","read.pause":"Pause","read.resume":"Resume","read.restart":"Read again","read.stop":"Stop reading","read.title":"Read the last message aloud","command.read":"Read the last message aloud","command.read.description":"Speaks the last reply with a system voice","read.noSession":"Open a conversation to read its last message.","read.empty":"The last message has no text to read.","read.error":"The last message could not be read.","read.noVoices":"Windows has no voices installed for reading.","speech.section":"Read aloud","speech.voice":"Voice","speech.voice.description":"A system voice. Automatic picks one in the app language.","speech.voice.auto":"Automatic","speech.rate":"Speed","speech.rate.description":"How fast the text is spoken.","speech.rate.slow":"0.8×","speech.rate.normal":"1×","speech.rate.fast":"1.2×","speech.rate.faster":"1.5×","speech.skipCode":"Skip code blocks","speech.skipCode.description":"Read only the prose; code, paths and commands are left out.","speech.preview":"Test voice","speech.preview.description":"Speaks a short sample with the current voice and speed.","speech.preview.text":"Hello, this is a reading test."},es:{"pill.idle":"Dictar","pill.starting":"Iniciando…","pill.listening":"Escuchando…","pill.dictating":"Dictando…","pill.error":"Reintentar dictado","pill.title":"Dictado por voz","pill.winH":"Abrir el dictado de Windows (Win+H)","pill.stop":"Detener dictado","command.toggle":"Alternar dictado por voz","command.toggle.description":"Dicta en el prompt con el motor elegido","command.configure":"Ajustes de dictado por voz","error.title":"Dictado por voz","error.language":"El idioma de reconocimiento {locale} no está instalado. Disponibles: {available}.","error.none":"Windows no tiene ningún reconocedor de voz instalado. Configuración › Hora e idioma › Idioma › Voz.","error.mic":"No hay ningún micrófono disponible para el reconocimiento de voz.","error.system":"System.Speech no está disponible en esta instalación de Windows.","error.exit":"El motor de dictado se detuvo inesperadamente.","error.unknown":"El dictado falló ({code}).","toast.discarded":"Dictado descartado: la sesión activa cambió.","settings.title":"Dictado por voz","settings.description":"Dictado offline con el reconocedor de voz de Windows. El texto se inserta en el prompt; nunca se envía solo.","settings.section":"Dictado","settings.engine":"Motor de dictado","settings.engine.description":"Windows usa el dictado de Windows 11 (Win+H), más preciso. System.Speech funciona sin Windows 11 pero es menos exacto.","engine.windows":"Windows Voice Typing (Win+H)","engine.system":"System.Speech (offline)","settings.winh":"Probar Win+H","settings.winh.description":"Envía el atajo del dictado de Windows. Si aparece la barra flotante, funciona.","settings.winh.run":"Probar Win+H","settings.winh.sent":"Win+H enviado. Si no apareció la barra, revisa Configuración › Accesibilidad › Dictado por voz.","settings.language":"Idioma","settings.language.description":"Un reconocedor instalado en Windows. Los acentos y la puntuación dependen de él.","settings.confidence":"Confianza mínima","settings.confidence.description":"Los resultados por debajo de este umbral se ignoran para evitar ruido.","confidence.low":"Baja (0,2)","confidence.normal":"Normal (0,4)","confidence.high":"Alta (0,6)","settings.space":"Añadir un espacio antes del texto","settings.space.description":"Separa el dictado de lo que ya hay en el prompt.","settings.focus":"Enfocar el prompt al terminar","settings.focus.description":"Mueve el cursor al prompt para revisar o enviar el texto.","settings.test.section":"Diagnóstico","settings.test":"Probar micrófono","settings.test.description":"Comprueba los reconocedores instalados y el micrófono predeterminado.","settings.test.run":"Ejecutar prueba","settings.test.success":"Reconocimiento de voz listo: {locale}","settings.test.failed":"No está listo: {reason}","common.reason.no-recognizers":"no hay ningún idioma de voz instalado","common.reason.no-microphone":"no hay micrófono disponible","read.idle":"Leer","read.speaking":"Leyendo…","read.paused":"Pausado","read.pause":"Pausar","read.resume":"Reanudar","read.restart":"Leer de nuevo","read.stop":"Detener lectura","read.title":"Leer en voz alta el último mensaje","command.read":"Leer en voz alta el último mensaje","command.read.description":"Reproduce la última respuesta con una voz del sistema","read.noSession":"Abre una conversación para leer su último mensaje.","read.empty":"El último mensaje no tiene texto para leer.","read.error":"No se pudo leer el último mensaje.","read.noVoices":"Windows no tiene voces instaladas para la lectura.","speech.section":"Lectura en voz alta","speech.voice":"Voz","speech.voice.description":"Una voz del sistema. Automática elige una en el idioma de la app.","speech.voice.auto":"Automática","speech.rate":"Velocidad","speech.rate.description":"A qué ritmo se lee el texto.","speech.rate.slow":"0,8×","speech.rate.normal":"1×","speech.rate.fast":"1,2×","speech.rate.faster":"1,5×","speech.skipCode":"Ignorar bloques de código","speech.skipCode.description":"Lee solo la prosa; omite código, rutas y comandos.","speech.preview":"Probar voz","speech.preview.description":"Lee una frase corta con la voz y velocidad actuales.","speech.preview.text":"Hola, esta es una prueba de lectura."}}}),D=v.Ipc.define({id:"voice-dictation.dictation",state:l.Schema.Struct({status:l.Schema.Literals(["idle","starting","listening","error"]),error:l.Schema.String,locale:l.Schema.String}),methods:{start:{input:l.Schema.Struct({locale:l.Schema.String,minConfidence:l.Schema.Number})},stop:{},diagnose:{output:l.Schema.Struct({locales:l.Schema.Array(l.Schema.String),microphone:l.Schema.Boolean,selected:l.Schema.String,error:l.Schema.String})}},events:{final:l.Schema.Struct({text:l.Schema.String,confidence:l.Schema.Number}),error:l.Schema.Struct({code:l.Schema.String,detail:l.Schema.String,available:l.Schema.Array(l.Schema.String)})}}),q=v.Ipc.define({id:"voice-dictation.speech",methods:{speak:{input:l.Schema.Struct({text:l.Schema.String,rate:l.Schema.Number,voice:l.Schema.String})},stop:{},voices:{output:l.Schema.Array(l.Schema.String)}},events:{done:l.Schema.Struct({ok:l.Schema.Boolean})}}),H=v.Ipc.define({id:"voice-dictation.voice-typing",methods:{toggle:{}}}),j=String.raw`param(
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
`,ne="powershell.exe";function K(){const e=P.join(F.tmpdir(),"opencode-voice-dictation");A.mkdirSync(e,{recursive:!0});const t=z.createHash("sha1").update(j).digest("hex").slice(0,12),i=P.join(e,`dictation-${t}.ps1`);return A.writeFileSync(i,j,"utf8"),i}function Z(e){return W.spawn(ne,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function X(e){const t=e.pid;if(t===void 0){e.kill();return}W.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function oe(e,t){const i=Z(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",K(),"-Culture",e.locale,"-MinConfidence",String(e.minConfidence)]);let c=!1,o="",r="";const p=s=>{switch(s.type){case"ready":t.onReady(s.locale??e.locale);break;case"final":s.text&&t.onFinal(s.text,s.confidence??0);break;case"error":t.onError(s.code??"UNKNOWN",s.detail??"",s.available??[]);break}};return i.stdout?.setEncoding("utf8"),i.stdout?.on("data",s=>{r+=s;let a=r.indexOf(`
`);for(;a>=0;){const d=r.slice(0,a).replace(/\r$/,"").trim();if(r=r.slice(a+1),d)try{p(JSON.parse(d))}catch{}a=r.indexOf(`
`)}}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",s=>{o=(o+s).slice(-2e3)}),i.on("error",s=>{c||t.onError("ENGINE_START_FAILED",s.message,[])}),i.on("close",s=>{c||t.onExit(s,o.trim().slice(-500))}),{stop(){c=!0,X(i)}}}function re(){return new Promise((e,t)=>{const i=Z(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",K(),"-Diagnose"]);let c="",o="",r=!1;const p=(a,d)=>{r||(r=!0,clearTimeout(s),a?t(a):e(d))},s=setTimeout(()=>{X(i),p(new Error("diagnose timed out"))},2e4);i.stdout?.setEncoding("utf8"),i.stdout?.on("data",a=>{c+=a}),i.stderr?.setEncoding("utf8"),i.stderr?.on("data",a=>{o+=a}),i.on("error",a=>p(a)),i.on("close",()=>{const a=c.split(/\r?\n/).map(d=>d.trim()).filter(d=>d.startsWith("{")).at(-1);if(!a){p(new Error(o.trim()||"no output from PowerShell"));return}try{const d=JSON.parse(a);p(void 0,{locales:d.locales??[],microphone:d.microphone===!0,selected:d.selected??"",error:d.error??""})}catch(d){p(d instanceof Error?d:new Error(String(d)))}})})}const M=String.raw`param(
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
`,se="powershell.exe";function Y(){const e=P.join(F.tmpdir(),"opencode-voice-dictation");return A.mkdirSync(e,{recursive:!0}),e}function J(){const e=z.createHash("sha1").update(M).digest("hex").slice(0,12),t=P.join(Y(),`speak-${e}.ps1`);return A.writeFileSync(t,M,"utf8"),t}function ae(e){const t=P.join(Y(),`speech-${z.randomUUID()}.txt`);return A.writeFileSync(t,e,"utf8"),t}function Q(e){return W.spawn(se,e,{windowsHide:!0,stdio:["ignore","pipe","pipe"]})}function x(e){const t=e.pid;if(t===void 0){e.kill();return}W.spawn("taskkill",["/PID",String(t),"/T","/F"],{windowsHide:!0,stdio:"ignore"}).on("error",()=>e.kill())}function ce(e){return Math.max(-10,Math.min(10,Math.round((e-1)*5)))}function le(e,t){const i=ae(e.text),c=Q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",J(),"-TextFile",i,"-Rate",String(ce(e.rate)),"-Voice",e.voice]);let o=!1;const r=()=>{try{A.rmSync(i,{force:!0})}catch{}};return c.on("error",()=>{r(),o||t(!1)}),c.on("close",p=>{r(),o||t(p===0)}),{stop(){o=!0,x(c),r()}}}function de(){return new Promise(e=>{const t=Q(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",J(),"-ListVoices"]);let i="",c=!1;const o=p=>{c||(c=!0,clearTimeout(r),e(p))},r=setTimeout(()=>{x(t),o([])},1e4);t.stdout?.setEncoding("utf8"),t.stdout?.on("data",p=>{i+=p}),t.on("error",()=>o([])),t.on("close",()=>{const p=i.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length>0);o(p)})})}const G=String.raw`$ErrorActionPreference = "Stop"

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
`,pe="powershell.exe";function ue(){const e=P.join(F.tmpdir(),"opencode-voice-dictation");A.mkdirSync(e,{recursive:!0});const t=z.createHash("sha1").update(G).digest("hex").slice(0,12),i=P.join(e,`win-h-${t}.ps1`);return A.writeFileSync(i,G,"utf8"),i}function ge(e){return W.spawn(pe,e,{windowsHide:!0,stdio:"ignore"})}function me(){return new Promise((e,t)=>{const i=ge(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",ue()]);i.on("error",c=>t(c)),i.on("close",c=>{c===0?e():t(new Error(`Win+H helper exited with code ${c??"unknown"}`))})})}const he=e=>{let t="idle",i="",c="",o,r=!1;const p=()=>{o=void 0,r=!1},s=e.provide(D,{state:()=>({status:t,error:i,locale:c}),start(b,k){o&&(r=!0,o.stop(),p()),t="starting",i="",c=b.locale,s.changed();const I=k.window;try{o=oe({locale:b.locale,minConfidence:b.minConfidence},{onReady(h){t="listening",c=h,s.changed()},onFinal(h,m){s.emit("final",{text:h,confidence:m},I)},onError(h,m,T){t="error",i=h,s.changed(),s.emit("error",{code:h,detail:m,available:T},I)},onExit(h,m){if(r){p(),t="idle",i="",c="",s.changed();return}p(),t!=="error"&&(t="error",i=h===null?"ENGINE_EXIT":`ENGINE_EXIT_${h}`,s.changed(),s.emit("error",{code:"ENGINE_EXIT",detail:m||(h===null?"":String(h)),available:[]},I))}})}catch(h){throw t="error",i="ENGINE_START_FAILED",s.changed(),h}},stop(){o&&(r=!0,o.stop(),p()),t="idle",i="",c="",s.changed()},diagnose(){return re()}});let a;const d=e.provide(q,{speak(b){a?.stop(),a=le(b,k=>{a=void 0,d.emit("done",{ok:k})})},stop(){a&&(a.stop(),a=void 0),d.emit("done",{ok:!0})},voices(){return de()}});e.provide(H,{toggle(){return me()}}),e.onCleanup(()=>{o&&(r=!0,o.stop(),p()),a?.stop(),a=void 0})},fe=250;function Se(e,t){let i=e.replace(/\r\n/g,`
`);return t?i=i.replace(/```[\s\S]*?```/g," "):i=i.replace(/```[^\n]*\n([\s\S]*?)```/g,"$1"),i=i.replace(/`([^`]+)`/g,"$1"),i=i.replace(/!\[[^\]]*\]\([^)]*\)/g," "),i=i.replace(/\[([^\]]+)\]\([^)]*\)/g,"$1"),i=i.replace(/^\s*#{1,6}\s+/gm,""),i=i.replace(/^\s*>\s?/gm,""),i=i.replace(/^\s*[-*+]\s+/gm,""),i=i.replace(/^\s*\d+\.\s+/gm,""),i=i.replace(/(\*\*|__)(.*?)\1/g,"$2"),i=i.replace(/(\*|_)(.*?)\1/g,"$2"),i=i.replace(/^\s*\|.*\|\s*$/gm," "),i=i.replace(/\n{2,}/g,". "),i=i.replace(/\n/g," "),i=i.replace(/\s+/g," "),i=i.replace(/\s+([.,;:!?])/g,"$1"),i=i.replace(/([.,;:!?]){2,}/g,"$1"),i.trim()}function ve(e,t=fe){const i=e.trim();if(!i)return[];const c=i.split(new RegExp("(?<=[.!?…])\\s+")),o=[];let r="";const p=s=>{let a="";for(const d of s.split(/\s+/))d&&(a&&a.length+1+d.length>t?(o.push(a),a=d):a=a?`${a} ${d}`:d);return a};for(const s of c){if(s.length>t){r&&(o.push(r),r=""),r=p(s);continue}r&&r.length+1+s.length>t?(o.push(r),r=s):r=r?`${r} ${s}`:s}return r&&o.push(r),o}function we(e,t){const i=e.stores.speech,[c,o]=R.createSignal(!1),[r,p]=R.createSignal(!1),[s,a]=R.createSignal([]),[d,b]=R.createSignal("none");let k=0,I=[],h="";const m=()=>typeof globalThis.speechSynthesis<"u"?globalThis.speechSynthesis:void 0,T=()=>{const w=m()?.getVoices()??[];if(w.length===0)return;const y=i.value.voiceURI;if(y){const C=w.find(O=>O.voiceURI===y);if(C)return C}const E=e.locale.locale().split("-")[0]?.toLowerCase()??"es";return w.find(C=>C.lang.toLowerCase().startsWith(E))??w[0]},N=async()=>{const w=m()?.getVoices()??[];if(w.length>0){a(w.map(y=>({id:y.voiceURI,label:`${y.name} — ${y.lang}`}))),b("web");return}try{const y=await t.voices();if(y.length>0){a(y.map(E=>({id:E,label:E}))),b("sapi");return}}catch{}b("none")},u=()=>{k++,I=[],m()?.cancel(),p(!1),o(!1),t.stop().catch(()=>{})},f=()=>d()==="web",$=()=>{!c()||r()||!f()||(m()?.pause(),p(!0))},n=()=>{!c()||!r()||!f()||(m()?.resume(),p(!1))},S=()=>{r()?n():$()},U=()=>h?L(h):Promise.resolve(!1),L=async w=>{h=w;const y=Se(w,i.value.skipCode);if(!y)return!1;if(u(),await N(),d()==="web"){const E=m();if(!E)return!1;const C=T(),O=i.value.rate,te=k;I=ve(y),o(!0),p(!1);const V=()=>{if(te!==k)return;const B=I.shift();if(!B){p(!1),o(!1);return}const _=new SpeechSynthesisUtterance(B);C&&(_.voice=C),C?.lang&&(_.lang=C.lang),_.rate=O,_.onend=V,_.onerror=V,E.speak(_)};return V(),!0}if(d()==="sapi"){o(!0),p(!1);try{await t.speak({text:y,rate:i.value.rate,voice:i.value.voiceURI})}catch(E){throw o(!1),E}return!0}throw o(!1),new Error(e.t("read.noVoices"))},ee=async()=>{const w=e.sessions.current();if(!w)return"";const E=(await w.server.client.message.list({sessionID:w.id,type:"assistant",order:"desc",limit:1})).data[0];return!E||E.type!=="assistant"?"":E.content.filter(C=>C.type==="text").map(C=>C.text).join(`
`)};return t.on("done",()=>{p(!1),o(!1)}),m()?.addEventListener?.("voiceschanged",()=>{N()}),N(),{speaking:c,paused:r,backend:d,canPause:f,voices:s,refreshVoices:N,lastAssistantText:ee,speak:L,cancel:u,pause:$,resume:n,togglePause:S,restart:U,preview:()=>L(e.t("speech.preview.text"))}}const ye=["es-ES","es-MX","es-AR","es-CO","pt-BR","pt-PT","en-US","en-GB","fr-FR","de-DE","it-IT"];function be(e){const t=v.usePlugin(),i=t.ui,c=t.stores.prefs,o=t.stores.speech,r=t.stores.engine,p=t.main(D),s=t.main(H),[a,d]=R.createSignal([]),[b,k]=R.createSignal(!1);R.onMount(()=>{p.diagnose().then(n=>{n.locales.length>0&&d(n.locales)}).catch(()=>{}),e.speaker.refreshVoices()});const I=()=>{const n=a(),S=c.value.locale;return(n.includes(S)?n:[S,...n]).map(L=>({value:L,label:L}))},h=()=>[{value:"",label:t.t("speech.voice.auto")},...e.speaker.voices().map(n=>({value:n.id,label:n.label}))],m=n=>{c.update(S=>{n.locale!==void 0&&(S.locale=n.locale),n.minConfidence!==void 0&&(S.minConfidence=n.minConfidence),n.trailingSpace!==void 0&&(S.trailingSpace=n.trailingSpace),n.autoFocus!==void 0&&(S.autoFocus=n.autoFocus)})},T=n=>{o.update(S=>{n.voiceURI!==void 0&&(S.voiceURI=n.voiceURI),n.rate!==void 0&&(S.rate=n.rate),n.skipCode!==void 0&&(S.skipCode=n.skipCode)})},N=n=>{r.update(S=>{S.mode=n})},u=async()=>{try{await s.toggle(),t.toast.show({variant:"default",title:t.t("settings.winh"),description:t.t("settings.winh.sent")})}catch(n){t.toast.show({variant:"error",title:t.t("pill.title"),description:n instanceof Error?n.message:t.t("error.winh")})}},f=async()=>{try{await e.speaker.preview()}catch(n){t.toast.show({variant:"error",title:t.t("read.title"),description:n instanceof Error?n.message:t.t("read.error")})}},$=async()=>{k(!0);try{const n=await p.diagnose();if(n.locales.length===0){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-recognizers")}),persistent:!0});return}if(!n.microphone){t.toast.show({variant:"error",title:t.t("error.title"),description:t.t("settings.test.failed",{reason:t.t("common.reason.no-microphone")}),persistent:!0});return}n.locales.length>0&&!a().length&&d(n.locales),t.toast.show({variant:"success",title:t.t("error.title"),description:t.t("settings.test.success",{locale:n.selected||n.locales[0]||c.value.locale})})}catch(n){t.toast.show({variant:"error",title:t.t("error.title"),description:n instanceof Error?n.message:String(n)})}finally{k(!1)}};return g.createComponent(i.SettingsLayout,{get title(){return t.t("settings.title")},get description(){return t.t("settings.description")},get children(){return[g.createComponent(i.SettingsSection,{get title(){return t.t("settings.section")},get children(){return[g.createComponent(i.SettingsRow,{id:"engine",get title(){return t.t("settings.engine")},get description(){return t.t("settings.engine.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.engine")},get value(){return r.value.mode},get options(){return[{value:"windows",label:t.t("engine.windows")},{value:"system",label:t.t("engine.system")}]},onChange:n=>N(n)})}}),g.createComponent(R.Show,{get when(){return r.value.mode==="windows"},get children(){return g.createComponent(i.SettingsRow,{id:"winh",get title(){return t.t("settings.winh")},get description(){return t.t("settings.winh.description")},get children(){return g.createComponent(i.Button,{onClick:()=>{u()},get children(){return t.t("settings.winh.run")}})}})}}),g.createComponent(R.Show,{get when(){return r.value.mode==="system"},get children(){return[g.createComponent(i.SettingsRow,{id:"language",get title(){return t.t("settings.language")},get description(){return t.t("settings.language.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.language")},get value(){return c.value.locale},get options(){return g.memo(()=>I().length>0)()?I():ye.map(n=>({value:n,label:n}))},onChange:n=>m({locale:n})})}}),g.createComponent(i.SettingsRow,{id:"confidence",get title(){return t.t("settings.confidence")},get description(){return t.t("settings.confidence.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("settings.confidence")},get value(){return String(c.value.minConfidence)},get options(){return[{value:"0.2",label:t.t("confidence.low")},{value:"0.4",label:t.t("confidence.normal")},{value:"0.6",label:t.t("confidence.high")}]},onChange:n=>m({minConfidence:Number(n)||.4})})}}),g.createComponent(i.SettingsRow,{id:"space",get title(){return t.t("settings.space")},get description(){return t.t("settings.space.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("settings.space")},hideLabel:!0,get checked(){return c.value.trailingSpace},onChange:n=>m({trailingSpace:n})})}}),g.createComponent(i.SettingsRow,{id:"focus",get title(){return t.t("settings.focus")},get description(){return t.t("settings.focus.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("settings.focus")},hideLabel:!0,get checked(){return c.value.autoFocus},onChange:n=>m({autoFocus:n})})}})]}})]}}),g.createComponent(i.SettingsSection,{get title(){return t.t("speech.section")},get children(){return[g.createComponent(i.SettingsRow,{id:"voice",get title(){return t.t("speech.voice")},get description(){return t.t("speech.voice.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("speech.voice")},get value(){return o.value.voiceURI},get options(){return h()},onChange:n=>T({voiceURI:n})})}}),g.createComponent(i.SettingsRow,{id:"rate",get title(){return t.t("speech.rate")},get description(){return t.t("speech.rate.description")},get children(){return g.createComponent(i.Select,{get label(){return t.t("speech.rate")},get value(){return String(o.value.rate)},get options(){return[{value:"0.8",label:t.t("speech.rate.slow")},{value:"1",label:t.t("speech.rate.normal")},{value:"1.2",label:t.t("speech.rate.fast")},{value:"1.5",label:t.t("speech.rate.faster")}]},onChange:n=>T({rate:Number(n)||1})})}}),g.createComponent(i.SettingsRow,{id:"skip-code",get title(){return t.t("speech.skipCode")},get description(){return t.t("speech.skipCode.description")},get children(){return g.createComponent(i.Switch,{get label(){return t.t("speech.skipCode")},hideLabel:!0,get checked(){return o.value.skipCode},onChange:n=>T({skipCode:n})})}}),g.createComponent(i.SettingsRow,{id:"preview",get title(){return t.t("speech.preview")},get description(){return t.t("speech.preview.description")},get children(){return g.createComponent(i.Button,{onClick:()=>{f()},get children(){return t.t("read.idle")}})}})]}}),g.createComponent(i.SettingsSection,{get title(){return t.t("settings.test.section")},get children(){return g.createComponent(i.SettingsRow,{id:"test",get title(){return t.t("settings.test")},get description(){return t.t("settings.test.description")},get children(){return g.createComponent(i.Button,{get busy(){return b()},onClick:()=>{$()},get children(){return t.t("settings.test.run")}})}})}})]}})}const $e=e=>{const t=e.main(D),i=e.main(q),c=e.main(H),o=we(e,i),r=e.stores.prefs,p=e.stores.engine,[s,a]=R.createSignal(!1);let d;const b=(u,f,$)=>{switch(u){case"LANGUAGE_NOT_AVAILABLE":return e.t("error.language",{locale:f||r.value.locale,available:$.length>0?$.join(", "):"—"});case"NO_RECOGNIZERS":return e.t("error.none");case"MICROPHONE_UNAVAILABLE":return e.t("error.mic");case"SYSTEM_SPEECH_UNAVAILABLE":return e.t("error.system");case"ENGINE_EXIT":return e.t("error.exit");default:return e.t("error.unknown",{code:u})}},k=()=>{s()&&(a(!1),c.toggle().catch(()=>{})),o.cancel(),d=e.sessions.current()?.key,t.start({locale:r.value.locale,minConfidence:r.value.minConfidence}).catch(u=>{e.toast.show({variant:"error",title:e.t("error.title"),description:u instanceof Error?u.message:String(u)})})},I=()=>{t.stop().catch(()=>{})},h=()=>{o.cancel(),e.screen.current()?.composer.focus(),c.toggle().then(()=>a(u=>!u)).catch(u=>{a(!1),e.toast.show({variant:"error",title:e.t("pill.title"),description:u instanceof Error?`${e.t("error.winh")} ${u.message}`:e.t("error.winh")})})},m=()=>{if(p.value.mode==="windows"){h();return}const u=t.state()?.status??"idle";u==="starting"||u==="listening"?I():k()},T=()=>{if(o.speaking()){o.cancel();return}if(!e.sessions.current()){e.toast.show({variant:"error",title:e.t("read.title"),description:e.t("read.noSession")});return}const u=t.state()?.status??"idle";(u==="starting"||u==="listening")&&t.stop().catch(()=>{}),(async()=>{try{const f=await o.lastAssistantText();if(!f.trim()){e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")});return}await o.speak(f)||e.toast.show({variant:"default",title:e.t("read.title"),description:e.t("read.empty")})}catch(f){e.toast.show({variant:"error",title:e.t("read.title"),description:f instanceof Error?f.message:e.t("read.error")})}})()};t.on("final",u=>{const f=e.sessions.current()?.key;if(d&&f&&f!==d){e.toast.show({variant:"error",title:e.t("error.title"),description:e.t("toast.discarded")});return}const $=e.screen.current()?.composer;if(!$)return;const n=$.text(),S=r.value.trailingSpace&&n.length>0&&!/\s$/.test(n)?" ":"";$.insert(S+u.text),r.value.autoFocus&&$.focus()}),t.on("error",u=>{e.toast.show({variant:"error",title:e.t("error.title"),description:b(u.code,u.detail,u.available),persistent:u.code==="LANGUAGE_NOT_AVAILABLE"||u.code==="NO_RECOGNIZERS",duration:8e3})});const N=()=>{if(e.app.platform!=="desktop")return;if(p.value.mode==="windows")return s()?{label:e.t("pill.dictating"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:m}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.winH"),run:m};const u=t.state()?.status??"idle";return u==="starting"?{label:e.t("pill.starting"),icon:"outline-wave-audio",title:e.t("pill.title"),run:m}:u==="listening"?{label:e.t("pill.listening"),icon:"outline-wave-audio",tone:"danger",title:e.t("pill.stop"),run:m}:u==="error"?{label:e.t("pill.error"),icon:"outline-wave-audio",tone:"warning",title:e.t("pill.title"),run:m}:{label:e.t("pill.idle"),icon:"outline-wave-audio",title:e.t("pill.title"),run:m}};e.add(v.ComposerPill,()=>({id:"dictate",show:()=>N()})),e.add(v.ComposerPill,()=>({id:"read",order:1,show:()=>{if(e.app.platform!=="desktop")return;if(!o.speaking())return{label:e.t("read.idle"),icon:"outline-audio",title:e.t("read.title"),run:T};const u=o.paused(),f=[];return o.canPause()&&f.push({id:"pause",label:u?e.t("read.resume"):e.t("read.pause"),icon:"outline-audio",run:()=>o.togglePause()}),f.push({id:"restart",label:e.t("read.restart"),icon:"outline-reset",run:()=>{o.restart()}}),f.push({id:"stop",label:e.t("read.stop"),icon:"xmark-small",tone:"danger",run:()=>o.cancel()}),{label:u?e.t("read.paused"):e.t("read.speaking"),icon:"outline-audio",tone:"success",title:e.t("read.title"),rows:f}}})),e.add(v.Command,()=>({id:"toggle",title:e.t("command.toggle"),description:e.t("command.toggle.description"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+m",slash:{name:"dictado"},editable:!0,enabled:e.app.platform==="desktop",run:m})),e.add(v.Command,()=>({id:"configure",title:e.t("command.configure"),keywords:"voice dictation microphone speech dictado voz microfono",group:e.t("pill.title"),enabled:e.app.platform==="desktop",run:()=>e.layout.settings(e.id)})),e.add(v.Command,()=>({id:"read",title:e.t("command.read"),description:e.t("command.read.description"),keywords:"read aloud speech voice leer voz altavoz lectura",group:e.t("pill.title"),section:"prompt",bind:"mod+shift+l",slash:{name:"leer"},editable:!0,enabled:e.app.platform==="desktop",run:T})),e.add(v.SettingsPage,{id:e.id,icon:"outline-audio",get title(){return e.t("settings.title")},get entries(){return[{id:"engine",title:e.t("settings.engine"),keywords:"engine motor dictation dictado winh voz"},{id:"winh",title:e.t("settings.winh"),keywords:"winh windows voice typing dictado"},{id:"language",title:e.t("settings.language"),keywords:"voice language idioma voz"},{id:"confidence",title:e.t("settings.confidence"),keywords:"voice confidence confianza"},{id:"test",title:e.t("settings.test"),keywords:"voice microphone microphone test microfono"},{id:"voice",title:e.t("speech.voice"),keywords:"read aloud voice voz lectura altavoz"},{id:"rate",title:e.t("speech.rate"),keywords:"read aloud speed velocidad lectura"},{id:"skip-code",title:e.t("speech.skipCode"),keywords:"read aloud code codigo lectura"},{id:"preview",title:e.t("speech.preview"),keywords:"read aloud test voice probar voz"}]},render:()=>g.createComponent(be,{speaker:o})})},Ee=v.Plugin.define({...ie,setup:$e,main:he});exports.default=Ee;
