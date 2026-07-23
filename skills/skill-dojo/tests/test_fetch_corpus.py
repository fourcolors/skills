import json
from pathlib import Path

import pytest

from scripts.fetch_corpus import fetch_corpus, _projects_dir


def _write_session(dir_: Path, session_id: str, turns: list[tuple[str, str]]) -> Path:
    """turns is a list of (role, content_str). Writes one JSON object per line.
    Returns the file path."""
    path = dir_ / f"{session_id}.jsonl"
    lines = []
    for i, (role, content) in enumerate(turns):
        ts = f"2026-05-10T12:00:{i:02d}.000Z"
        lines.append(json.dumps({
            "sessionId": session_id,
            "timestamp": ts,
            "type": role,
            "message": {"content": content},
        }))
    path.write_text("\n".join(lines) + "\n")
    return path


def test_returns_only_sessions_matching_trigger(tmp_path, monkeypatch):
    _write_session(tmp_path, "s1", [("user", "looking for hotel rooms"), ("assistant", "sure!")])
    _write_session(tmp_path, "s2", [("user", "what's the weather"), ("assistant", "sunny")])
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=10)
    ids = {s["session_id"] for s in out}
    assert ids == {"s1"}


def test_case_insensitive_match(tmp_path, monkeypatch):
    _write_session(tmp_path, "s1", [("user", "Find me a HOTEL ROOM")])
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=10)
    assert len(out) == 1
    assert out[0]["session_id"] == "s1"


def test_respects_limit(tmp_path, monkeypatch):
    for i in range(5):
        _write_session(tmp_path, f"s{i}", [("user", "hotel question")])
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=3)
    assert len(out) == 3


def test_transcript_contains_user_and_assistant_turns(tmp_path, monkeypatch):
    _write_session(tmp_path, "s1", [
        ("user", "find me a hotel"),
        ("assistant", "ocean view king available"),
    ])
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=10)
    assert "find me a hotel" in out[0]["transcript"]
    assert "ocean view king available" in out[0]["transcript"]


def test_handles_content_blocks_list(tmp_path, monkeypatch):
    """message.content can be a list of content blocks (the real format)."""
    path = tmp_path / "s1.jsonl"
    path.write_text(json.dumps({
        "sessionId": "s1",
        "timestamp": "2026-05-10T12:00:00.000Z",
        "type": "user",
        "message": {"content": [
            {"type": "text", "text": "looking for a hotel room"},
            {"type": "tool_use", "name": "search", "input": {}},
        ]},
    }) + "\n")
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=10)
    assert len(out) == 1
    assert "looking for a hotel room" in out[0]["transcript"]


def test_writes_jsonl_when_write_to_provided(tmp_path, monkeypatch):
    _write_session(tmp_path, "s1", [("user", "find me a hotel")])
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out_path = tmp_path / "out" / "corpus.jsonl"
    result = fetch_corpus("hotel", limit=10, write_to=out_path)
    assert out_path.exists()
    lines = out_path.read_text().strip().splitlines()
    assert len(lines) == len(result) == 1
    obj = json.loads(lines[0])
    assert obj["session_id"] == "s1"
    assert "find me a hotel" in obj["transcript"]


def test_skips_malformed_json_lines(tmp_path, monkeypatch):
    """A corrupt line in a session file should not crash the walker."""
    path = tmp_path / "s1.jsonl"
    path.write_text(
        "{not valid json\n"
        + json.dumps({"sessionId": "s1", "timestamp": "2026-05-10T12:00:00Z",
                      "type": "user", "message": {"content": "hotel room"}}) + "\n"
    )
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path))

    out = fetch_corpus("hotel", limit=10)
    assert len(out) == 1
    assert "hotel room" in out[0]["transcript"]


def test_missing_dir_returns_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path / "does-not-exist"))
    out = fetch_corpus("hotel", limit=10)
    assert out == []


def test_default_projects_dir_derived_from_cwd(monkeypatch, tmp_path):
    """When CLAUDE_PROJECTS_DIR is unset, default should be ~/.claude/projects/<cwd-hash>."""
    # Unset the override so the default kicks in
    monkeypatch.delenv("CLAUDE_PROJECTS_DIR", raising=False)
    monkeypatch.chdir(tmp_path)

    expected_hash = str(tmp_path.resolve()).replace("/", "-")
    expected = Path.home() / ".claude" / "projects" / expected_hash
    assert _projects_dir() == expected
