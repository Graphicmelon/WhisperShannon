# WhisperShannon

An interactive audio transcript player for language learners. Import any audio file, let [WhisperX](https://github.com/m-bain/whisperX) generate word-level timestamps, and study with a synchronized transcript where every word is clickable.

Built for French and Spanish learners, but works with any language WhisperX supports.

---

## Features

- **Word-level sync** — the current word highlights as audio plays
- **Click to seek** — click any word or sentence to jump there instantly
- **A-B loop** — mark a region and repeat it as many times as you need
- **Speed control** — 0.5× / 0.75× / 1× / 1.25×
- **Keyboard shortcuts** — `Space` play/pause, `←` / `→` skip ±3 s
- **Tape library** — manage multiple recordings in one place

---

## Requirements

| Requirement | Notes |
|---|---|
| **Python 3.9+** | Must be in your `PATH` |
| **whisperX** | Install before first run (see below) |
| **Node.js 18+** | Needed once to build the frontend; [nodejs.org](https://nodejs.org) |
| **ffmpeg** | Required by whisperX; [ffmpeg.org](https://ffmpeg.org/download.html) |

> After the first run, only Python + whisperX are needed.

### Install whisperX

```bash
# CPU (slower, no GPU needed)
pip install whisperx

# NVIDIA GPU (recommended for long files)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install whisperx
```

> On macOS with Apple Silicon, the CPU path works well. whisperX will use the `mps` device automatically on newer builds.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/WhisperShannon.git
cd WhisperShannon

# 2. Run  (Mac / Linux)
python3 start.py

# 2. Run  (Windows — double-click or:)
python start.py
```

`start.py` will:
1. Verify whisperX is installed in your current Python environment
2. Install FastAPI / uvicorn (lightweight, fast)
3. Build the frontend automatically (requires npm, first run only)
4. Open `http://localhost:8000` in your browser

---

## Usage

1. Click **新建磁带** (New Tape)
2. Drop an audio file (MP3, WAV, FLAC, M4A, …)
3. Choose the language and click **开始分析**
4. Wait for WhisperX to process (depends on file length and hardware)
5. The player opens automatically — click any word to seek, set A/B points to loop

---

## How It Works

```
Audio file
    │
    └─ WhisperX ──► word-level timestamps JSON
                            │
                    FastAPI backend
                            │
                    React player ──► click word → seek
                                     timeupdate → highlight
```

All processing is local — no audio is ever sent to a server.

---

## Project Structure

```
WhisperShannon/
├── start.py                  ← cross-platform launcher (Mac/Windows/Linux)
├── start.sh                  ← macOS/Linux shell wrapper
├── start.bat                 ← Windows batch wrapper
├── backend/
│   ├── main.py               ← FastAPI app + static file serving
│   ├── processors/
│   │   └── whisperx_proc.py  ← WhisperX transcription & alignment
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── HomePage.jsx
        │   ├── NewTapePage.jsx
        │   ├── ProcessingPage.jsx
        │   └── PlayerPage.jsx
        └── index.css
```

---

## Development

To run frontend and backend separately with hot-reload:

```bash
# Terminal 1 — backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend (Vite dev server with proxy)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

To rebuild the frontend after editing:

```bash
python3 start.py --build
# or directly:
cd frontend && npm run build
```

---

## Options

```
python start.py --build       Force-rebuild frontend even if dist/ exists
python start.py --no-browser  Don't auto-open browser on start
```

---

## License

MIT
