import json
import os
import sys

import whisperx

MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


try:
    model = whisperx.load_model(
        MODEL,
        DEVICE,
        compute_type="float16",
        vad_options={"vad_onset": 0.4, "vad_offset": 0.3},
    )
except Exception as exc:  # noqa: BLE001
    emit({"type": "error", "code": "MODEL_LOAD", "detail": str(exc)})
    sys.exit(1)

emit({"type": "ready", "model": MODEL, "device": DEVICE})

for raw in sys.stdin:
    line = raw.strip()
    if not line:
        continue

    request_id = None
    try:
        request = json.loads(line)
        request_id = request.get("id")
        language = request.get("language") or None
        audio = whisperx.load_audio(request["path"])
        result = model.transcribe(audio, language=language)
        text = " ".join(
            segment.get("text", "").strip() for segment in result.get("segments", [])
        ).strip()
        emit(
            {
                "id": request_id,
                "type": "result",
                "text": text,
                "language": result.get("language", ""),
            }
        )
    except Exception as exc:  # noqa: BLE001
        emit({"id": request_id, "type": "error", "detail": str(exc)})
