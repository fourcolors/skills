"""Fetch session transcripts from the local Claude Code projects store.

Claude Code writes per-session NDJSON files under
~/.claude/projects/<repo-hash>/<session-id>.jsonl. Each line is a JSON
record with `sessionId`, `timestamp`, `type` (user|assistant|...) and
`message.content` (a string or a list of content blocks).

The OTel pipeline is NOT a valid source — user prompts are redacted
before export and assistant text is not captured.
"""

from __future__ import annotations

import glob
import json
import os
from pathlib import Path


def _default_projects_dir() -> Path:
    """Derive the projects dir from the current working directory.

    Claude Code maps a project root to ~/.claude/projects/<hash>/ where <hash>
    is the absolute path with '/' replaced by '-' and a leading '-'.
    """
    cwd = Path.cwd().resolve()
    hash_name = str(cwd).replace("/", "-")  # leading '/' becomes leading '-' automatically
    return Path.home() / ".claude" / "projects" / hash_name


def _projects_dir() -> Path:
    override = os.environ.get("CLAUDE_PROJECTS_DIR")
    return Path(override) if override else _default_projects_dir()


def _extract_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return " ".join(parts)
    return ""


def _parse_session(path: Path) -> tuple[str, str] | None:
    """Returns (session_id, transcript_text) or None on error."""
    session_id = path.stem
    turns: list[str] = []
    try:
        with path.open() as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                role = obj.get("type")
                if role not in ("user", "assistant"):
                    continue
                content = obj.get("message", {}).get("content", "")
                text = _extract_text(content).strip()
                if text:
                    turns.append(f"[{role.upper()}] {text}")
    except OSError:
        return None
    if not turns:
        return None
    return session_id, "\n".join(turns)


def fetch_corpus(
    trigger: str, *, limit: int = 10, write_to: Path | None = None
) -> list[dict]:
    pdir = _projects_dir()
    if not pdir.is_dir():
        return []

    files = sorted(
        (Path(p) for p in glob.glob(str(pdir / "*.jsonl"))),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    needle = trigger.lower()
    results: list[dict] = []
    for fp in files:
        parsed = _parse_session(fp)
        if parsed is None:
            continue
        session_id, transcript = parsed
        if needle in transcript.lower():
            results.append({"session_id": session_id, "transcript": transcript})
            if len(results) >= limit:
                break

    if write_to is not None:
        write_to.parent.mkdir(parents=True, exist_ok=True)
        with write_to.open("w") as f:
            for s in results:
                f.write(json.dumps(s) + "\n")

    return results
