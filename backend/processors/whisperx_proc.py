"""
WhisperX processor — speech recognition + forced word-level alignment.

Install:
    pip install whisperx
    # GPU: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    # CPU: pip install torch torchvision torchaudio
"""


def process_whisperx(audio_path: str, language: str = "fr") -> dict:
    try:
        import whisperx
    except ImportError:
        raise ImportError(
            "whisperx is not installed. Run: pip install whisperx"
        )

    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    # 1. Transcribe
    model = whisperx.load_model("large-v2", device, compute_type=compute_type, language=language)
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, language=language, batch_size=16)

    # 2. Forced alignment for word timestamps
    model_a, metadata = whisperx.load_align_model(language_code=language, device=device)
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device,
        return_char_alignments=False,
    )

    return _normalize(result["segments"])


def _normalize(segments: list) -> dict:
    out = []
    for seg in segments:
        words = []
        for w in seg.get("words", []):
            words.append({
                "word": w["word"].strip(),
                "start": round(w.get("start", seg["start"]), 3),
                "end":   round(w.get("end",   seg["end"]),   3),
            })

        # Fallback: if no word-level data, treat the whole segment as one token
        if not words:
            words = [{
                "word":  seg["text"].strip(),
                "start": round(seg["start"], 3),
                "end":   round(seg["end"],   3),
            }]

        out.append({
            "text":  seg["text"].strip(),
            "start": round(seg["start"], 3),
            "end":   round(seg["end"],   3),
            "words": words,
        })

    return {"segments": out}
