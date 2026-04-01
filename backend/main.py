from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uuid, json, os, shutil
from datetime import datetime
from typing import Optional
from pathlib import Path

app = FastAPI(title="WhisperShannon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TAPES_FILE = DATA_DIR / "tapes.json"


# ---------- helpers ----------

def load_tapes() -> list:
    if TAPES_FILE.exists():
        return json.loads(TAPES_FILE.read_text(encoding="utf-8"))
    return []


def save_tapes(tapes: list):
    TAPES_FILE.write_text(json.dumps(tapes, ensure_ascii=False, indent=2), encoding="utf-8")


def get_tape(tape_id: str) -> Optional[dict]:
    return next((t for t in load_tapes() if t["id"] == tape_id), None)


def update_tape(tape_id: str, updates: dict):
    tapes = load_tapes()
    for t in tapes:
        if t["id"] == tape_id:
            t.update(updates)
    save_tapes(tapes)


# ---------- routes ----------

@app.get("/api/tapes")
def list_tapes():
    return load_tapes()


@app.get("/api/tapes/{tape_id}")
def get_tape_detail(tape_id: str):
    tape = get_tape(tape_id)
    if not tape:
        raise HTTPException(404, "Tape not found")

    words_file = DATA_DIR / tape_id / "words.json"
    if words_file.exists():
        tape["data"] = json.loads(words_file.read_text(encoding="utf-8"))

    return tape


@app.post("/api/tapes")
async def create_tape(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    language: str = Form("fr"),
    audio: UploadFile = File(...),
):
    tape_id = str(uuid.uuid4())
    tape_dir = DATA_DIR / tape_id
    tape_dir.mkdir(parents=True)

    audio_ext = audio.filename.rsplit(".", 1)[-1].lower() if "." in audio.filename else "mp3"
    audio_path = tape_dir / f"audio.{audio_ext}"
    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    tape = {
        "id": tape_id,
        "title": title,
        "language": language,
        "audio_ext": audio_ext,
        "status": "processing",
        "created_at": datetime.now().isoformat(),
        "error": None,
    }

    tapes = load_tapes()
    tapes.append(tape)
    save_tapes(tapes)

    background_tasks.add_task(
        process_tape,
        tape_id=tape_id,
        audio_path=str(audio_path),
        language=language,
    )

    return tape


@app.delete("/api/tapes/{tape_id}")
def delete_tape(tape_id: str):
    tape = get_tape(tape_id)
    if not tape:
        raise HTTPException(404, "Tape not found")

    tape_dir = DATA_DIR / tape_id
    if tape_dir.exists():
        shutil.rmtree(tape_dir)

    save_tapes([t for t in load_tapes() if t["id"] != tape_id])
    return {"ok": True}


@app.get("/api/audio/{tape_id}")
def get_audio(tape_id: str):
    tape = get_tape(tape_id)
    if not tape:
        raise HTTPException(404, "Tape not found")

    audio_path = DATA_DIR / tape_id / f"audio.{tape['audio_ext']}"
    if not audio_path.exists():
        raise HTTPException(404, "Audio file not found")

    return FileResponse(
        str(audio_path),
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"},
    )


# ---------- background processing ----------

def process_tape(tape_id: str, audio_path: str, language: str):
    try:
        from processors.whisperx_proc import process_whisperx
        data = process_whisperx(audio_path, language)

        words_file = DATA_DIR / tape_id / "words.json"
        words_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        update_tape(tape_id, {"status": "ready"})

    except Exception as exc:
        update_tape(tape_id, {"status": "error", "error": str(exc)})


# ---------- serve built frontend (production) ----------
# Must be registered AFTER all API routes so /api/* is not intercepted.

DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
