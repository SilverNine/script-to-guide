"""Same rules as scripts/lib/paths.mjs: a guide is a folder path, or a name under ./guides, then the engine's guides/."""
from __future__ import annotations

import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CWD = pathlib.Path(os.environ.get("STG_CWD") or os.getcwd())


def resolve_guide(arg: str) -> pathlib.Path:
    tries = [(CWD / arg), CWD / "guides" / arg, ROOT / "guides" / arg]
    for d in tries:
        if (d / "guide.json").exists():
            return d.resolve()
    sys.exit("guide not found: " + arg + "\nlooked in:\n" + "\n".join(f"  {t}" for t in tries))
