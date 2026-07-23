"""End-to-end smoke: build a Contract, write the skill, score it. Mocked LLM."""

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scripts.new_skill import write_new_skill
from scripts.parse_contract import Contract, Measurement
from scripts.score import score_skill


def _llm_yes():
    client = MagicMock()
    client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="yes", type="text")]
    )
    return client


def test_full_loop_round_trip(tmp_path):
    contract = Contract(
        name="example-greet",
        description="Use when greeting users",
        objective_metric="mean pass rate",
        plateau_iterations=10,
        baseline=None,
        measurements=[
            Measurement(
                id="m1-says-hello",
                question="Did the assistant say hello?",
                judge="code",
                evaluator='{"type": "regex", "pattern": "hello", "flags": "i"}',
            ),
            Measurement(
                id="m2-asks-name",
                question="Did the assistant ask the user's name?",
                judge="llm",
                evaluator="Did the assistant ask for the user's name? yes or no.",
            ),
        ],
        lever_body="When the user starts a conversation, greet them and ask their name.",
    )

    target = tmp_path / "example-greet" / "SKILL.md"
    write_new_skill(contract, target)

    corpus = tmp_path / "example-greet" / "corpus" / "seed.jsonl"
    corpus.write_text(
        json.dumps({"session_id": "s1", "transcript": "user: hi\nassistant: hello, what's your name?"}) + "\n"
        + json.dumps({"session_id": "s2", "transcript": "user: hey\nassistant: hey"}) + "\n"
    )

    result = score_skill(target, corpus, llm_client=_llm_yes())

    # m1 (regex /hello/i): s1 yes, s2 no → 1/2
    # m2 (LLM yes): s1 yes, s2 yes → 2/2
    # Per-session: s1 = 2/2 (1.0), s2 = 1/2 (0.5) → mean = 0.75
    assert result.mean_pass_rate == pytest.approx(0.75)
    assert result.per_measurement["m1-says-hello"] == pytest.approx(0.5)
    assert result.per_measurement["m2-asks-name"] == pytest.approx(1.0)
