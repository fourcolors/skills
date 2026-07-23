from unittest.mock import MagicMock

import pytest

from scripts.judge_llm import evaluate_llm
from scripts.parse_contract import Measurement


def _stub_client(answer: str) -> MagicMock:
    client = MagicMock()
    client.messages.create.return_value = MagicMock(
        content=[MagicMock(text=answer, type="text")]
    )
    return client


def test_yes_answer_passes():
    client = _stub_client("yes")
    m = Measurement(id="m", question="q", judge="llm", evaluator="Did the agent answer? yes or no.")
    assert evaluate_llm(m, "user: hi\nassistant: hi", client=client) is True


def test_no_answer_fails():
    client = _stub_client("No.")
    m = Measurement(id="m", question="q", judge="llm", evaluator="Did the agent answer? yes or no.")
    assert evaluate_llm(m, "user: hi\nassistant: ...", client=client) is False


def test_ambiguous_answer_fails_closed():
    client = _stub_client("It depends on context...")
    m = Measurement(id="m", question="q", judge="llm", evaluator="x? yes or no.")
    assert evaluate_llm(m, "...", client=client) is False


def test_uses_haiku_model():
    client = _stub_client("yes")
    m = Measurement(id="m", question="q", judge="llm", evaluator="prompt")
    evaluate_llm(m, "transcript", client=client)
    kwargs = client.messages.create.call_args.kwargs
    assert kwargs["model"] == "claude-haiku-4-5-20251001"
    assert kwargs["max_tokens"] <= 10


def test_transcript_substitutes_into_prompt():
    client = _stub_client("yes")
    m = Measurement(id="m", question="q", judge="llm", evaluator="Given: {{transcript}}\nAnswer yes or no.")
    evaluate_llm(m, "TRANSCRIPT_CONTENT", client=client)
    sent_prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "TRANSCRIPT_CONTENT" in sent_prompt
    assert "{{transcript}}" not in sent_prompt
