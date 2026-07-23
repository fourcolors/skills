import json
from pathlib import Path

import pytest

from scripts.judge_code import evaluate_code, InvalidSpecError
from scripts.parse_contract import Measurement


TRANSCRIPTS = [
    json.loads(line)
    for line in (Path(__file__).parent / "fixtures" / "sample_transcripts.jsonl")
    .read_text()
    .splitlines()
]


def _mk(spec: dict) -> Measurement:
    return Measurement(id="m", question="q", judge="code", evaluator=json.dumps(spec))


def test_substring_match_passes():
    m = _mk({"type": "substring", "value": "find me a room"})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_substring_match_fails_when_absent():
    m = _mk({"type": "substring", "value": "find me a room"})
    assert evaluate_code(m, TRANSCRIPTS[2]["transcript"]) is False


def test_regex_match_passes_with_flag_i():
    m = _mk({"type": "regex", "pattern": "SOFIA", "flags": "i"})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_regex_match_fails_without_flag_i():
    m = _mk({"type": "regex", "pattern": "SOFIA"})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is False


def test_all_combinator_passes_when_all_pass():
    m = _mk({"type": "all", "checks": [
        {"type": "substring", "value": "user:"},
        {"type": "substring", "value": "assistant:"},
    ]})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_all_combinator_fails_when_any_fails():
    m = _mk({"type": "all", "checks": [
        {"type": "substring", "value": "user:"},
        {"type": "substring", "value": "nonexistent"},
    ]})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is False


def test_any_combinator_passes_when_one_passes():
    m = _mk({"type": "any", "checks": [
        {"type": "substring", "value": "nonexistent"},
        {"type": "substring", "value": "sofia"},
    ]})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_not_combinator_inverts():
    m = _mk({"type": "not", "check": {"type": "substring", "value": "nonexistent"}})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_count_gte_passes():
    m = _mk({"type": "count_gte", "value": "user:", "n": 1})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_count_eq_passes():
    m = _mk({"type": "count_eq", "value": "assistant:", "n": 1})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is True


def test_invalid_json_returns_false_and_logs(caplog):
    m = Measurement(id="bad", question="q", judge="code", evaluator="{not json")
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is False


def test_unknown_type_returns_false_and_logs(caplog):
    m = _mk({"type": "wat", "value": "x"})
    assert evaluate_code(m, TRANSCRIPTS[0]["transcript"]) is False
