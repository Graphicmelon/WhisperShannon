#!/usr/bin/env python3
"""
WhisperShannon — cross-platform launcher
Works on macOS, Linux, and Windows.

Usage:
    python start.py           # starts the app
    python start.py --build   # force-rebuild the frontend
"""

import sys
import os
import shutil
import subprocess
import platform
import threading
import time
import webbrowser
import argparse
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

PORT = 8000
URL = f"http://localhost:{PORT}"


# ── colour helpers ────────────────────────────────────────────────────────────

IS_WIN = platform.system() == "Windows"

def green(s):  return s if IS_WIN else f"\033[32m{s}\033[0m"
def yellow(s): return s if IS_WIN else f"\033[33m{s}\033[0m"
def red(s):    return s if IS_WIN else f"\033[31m{s}\033[0m"
def bold(s):   return s if IS_WIN else f"\033[1m{s}\033[0m"


# ── checks ────────────────────────────────────────────────────────────────────

def check_whisperx():
    try:
        import whisperx  # noqa: F401
        print(green("✓ whisperx found"))
    except ImportError:
        print(red("✗ whisperx not found in the current Python environment."))
        print()
        print("  Install it first:")
        print("    pip install whisperx")
        print()
        print("  If you use conda, make sure you've activated the right environment")
        print("  before running this script.")
        sys.exit(1)


def install_backend_deps():
    """Install lightweight backend deps (fastapi, uvicorn) via pip."""
    try:
        import fastapi, uvicorn, multipart  # noqa: F401
        print(green("✓ backend dependencies already installed"))
    except ImportError:
        print(yellow("→ installing backend dependencies…"))
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q",
             "fastapi>=0.111", "uvicorn[standard]>=0.29", "python-multipart>=0.0.9"],
            check=True,
        )
        print(green("✓ backend dependencies installed"))


def find_npm():
    # shutil.which handles .cmd/.bat extensions on Windows via PATHEXT
    return shutil.which("npm")


def build_frontend(force: bool = False):
    if DIST_DIR.exists() and not force:
        print(green("✓ frontend already built"))
        return

    npm = find_npm()
    if npm is None:
        print(red("✗ npm not found."))
        print()
        print("  Node.js is required to build the frontend (one-time step).")
        print("  Download from: https://nodejs.org/")
        print()
        print("  After installing Node.js, re-run:  python start.py")
        sys.exit(1)

    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print(yellow("→ installing frontend dependencies (npm install)…"))
        subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=True)

    print(yellow("→ building frontend (npm run build)…"))
    subprocess.run([npm, "run", "build"], cwd=FRONTEND_DIR, check=True)
    print(green("✓ frontend built"))


# ── launcher ──────────────────────────────────────────────────────────────────

def open_browser_after(delay: float):
    def _open():
        time.sleep(delay)
        webbrowser.open(URL)
    threading.Thread(target=_open, daemon=True).start()


def start_server():
    import uvicorn

    # Add backend dir to path so `import main` works
    sys.path.insert(0, str(BACKEND_DIR))
    # Change to backend dir so relative paths inside main.py resolve correctly
    os.chdir(BACKEND_DIR)

    print()
    print(bold("  WhisperShannon"))
    print(f"  {green(URL)}")
    print()
    print("  Press Ctrl-C to stop.")
    print()

    open_browser_after(1.5)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="warning",   # keep console clean; errors still shown
    )


# ── main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WhisperShannon launcher")
    parser.add_argument("--build", action="store_true",
                        help="Force-rebuild the frontend even if dist/ exists")
    parser.add_argument("--no-browser", action="store_true",
                        help="Don't automatically open the browser")
    args = parser.parse_args()

    print()
    print(bold("WhisperShannon — starting up"))
    print("─" * 36)

    check_whisperx()
    install_backend_deps()
    build_frontend(force=args.build)

    if args.no_browser:
        # monkey-patch to skip browser open
        open_browser_after = lambda _: None  # noqa: E731

    start_server()
