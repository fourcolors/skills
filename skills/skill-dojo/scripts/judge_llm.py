"""Evaluate an LLM-judge measurement against one transcript using Haiku."""

from __future__ import annotations

import logging
import os
from typing import Any

from scripts.parse_contract import Measurement


_log = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 8
_YES_TOKENS = {"yes", "y", "true", "1"}


def _default_client() -> Any:
    from anthropic import Anthropic

    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def evaluate_llm(
    measurement: Measurement, transcript: str, *, client: Any | None = None
) -> bool:
    if client is None:
        client = _default_client()
    prompt = measurement.evaluator.replace("{{transcript}}", transcript)
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as exc:
        _log.warning("llm judge %s: %s: %s", measurement.id, type(exc).__name__, exc)
        return False

    answer_blocks = [b.text for b in response.content if getattr(b, "type", "text") == "text"]
    answer = " ".join(answer_blocks).strip().lower()
    first_word = answer.split()[0].rstrip(".,!?") if answer else ""
    return first_word in _YES_TOKENS
