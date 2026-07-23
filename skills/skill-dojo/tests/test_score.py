import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scripts.score import ScoreResult, score_skill


FIXTURE_SKILL = Path(__file__).parent / "fixtures" / "good_skill.md"
FIXTURE_CORPUS = Path(__file__).parent / "fixtures" / "sample_transcripts.jsonl"


def _llm_yes() -> MagicMock:
    client = MagicMock()
    client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="yes", type="text")]
    )
    return client


def test_returns_score_result_with_mean():
    result = score_skill(FIXTURE_SKILL, FIXTURE_CORPUS, llm_client=_llm_yes())
    assert isinstance(result, ScoreResult)
    assert 0.0 <= result.mean_pass_rate <= 1.0


def test_reports_per_measurement():
    result = score_skill(FIXTURE_SKILL, FIXTURE_CORPUS, llm_client=_llm_yes())
    assert "m1-fired-when-expected" in result.per_measurement
    assert "m2-output-matched" in result.per_measurement


def test_reports_per_session():
    result = score_skill(FIXTURE_SKILL, FIXTURE_CORPUS, llm_client=_llm_yes())
    assert set(result.per_session.keys()) == {"s1", "s2", "s3"}


def test_expected_score_with_known_fixture():
    # good_skill.md m1 evaluator: {"type": "substring", "value": "example-skill"}
    # None of the 3 transcripts contain "example-skill" → m1 passes 0/3
    # LLM mocked yes → m2 passes 3/3
    # Per-session: each = 1/2 → mean = 0.5
    result = score_skill(FIXTURE_SKILL, FIXTURE_CORPUS, llm_client=_llm_yes())
    assert result.mean_pass_rate == pytest.approx(0.5)
    assert result.per_measurement["m1-fired-when-expected"] == pytest.approx(0.0)
    assert result.per_measurement["m2-output-matched"] == pytest.approx(1.0)


def test_empty_corpus_returns_zero(tmp_path):
    empty = tmp_path / "empty.jsonl"
    empty.write_text("")
    result = score_skill(FIXTURE_SKILL, empty, llm_client=_llm_yes())
    assert result.mean_pass_rate == 0.0
    assert result.session_count == 0
