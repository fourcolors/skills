"""Score a skill: run all measurements × all transcripts; aggregate."""

from __future__ import annotations

import json
import logging
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from scripts.judge_code import evaluate_code
from scripts.judge_llm import evaluate_llm
from scripts.parse_contract import Contract, parse_contract


_log = logging.getLogger(__name__)


@dataclass
class ScoreResult:
    mean_pass_rate: float
    session_count: int
    per_measurement: dict[str, float] = field(default_factory=dict)
    per_session: dict[str, float] = field(default_factory=dict)


def _load_corpus(corpus_path: Path) -> list[dict]:
    if not corpus_path.exists():
        return []
    sessions = []
    for line in corpus_path.read_text().splitlines():
        line = line.strip()
        if line:
            sessions.append(json.loads(line))
    return sessions


def score_skill(
    skill_path: Path, corpus_path: Path, *, llm_client: Any | None = None
) -> ScoreResult:
    contract: Contract = parse_contract(skill_path)
    sessions = _load_corpus(corpus_path)

    if not sessions or not contract.measurements:
        return ScoreResult(mean_pass_rate=0.0, session_count=0)

    measurement_passes: dict[str, int] = {m.id: 0 for m in contract.measurements}
    session_rates: dict[str, float] = {}

    for sess in sessions:
        transcript = sess["transcript"]
        session_passes = 0
        for m in contract.measurements:
            if m.judge == "code":
                ok = evaluate_code(m, transcript)
            elif m.judge == "llm":
                ok = evaluate_llm(m, transcript, client=llm_client)
            else:
                _log.warning("unknown judge type %r for %s", m.judge, m.id)
                ok = False
            if ok:
                measurement_passes[m.id] += 1
                session_passes += 1
        session_rates[sess["session_id"]] = session_passes / len(contract.measurements)

    per_measurement = {
        mid: count / len(sessions) for mid, count in measurement_passes.items()
    }
    mean = statistics.mean(session_rates.values())

    return ScoreResult(
        mean_pass_rate=mean,
        session_count=len(sessions),
        per_measurement=per_measurement,
        per_session=session_rates,
    )
