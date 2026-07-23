"""Parse a SKILL.md into a structured Contract."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class Measurement:
    id: str
    question: str
    judge: str  # "code" | "llm"
    evaluator: str  # JSON spec for code; prompt string for llm


@dataclass
class Contract:
    name: str
    description: str
    objective_metric: str
    plateau_iterations: int
    baseline: float | None
    measurements: list[Measurement] = field(default_factory=list)
    lever_body: str = ""


_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
_CONTRACT_RE = re.compile(r"## Contract\b(.*?)(?=^## Skill\b)", re.DOTALL | re.MULTILINE)
_SKILL_BODY_RE = re.compile(r"^## Skill\b.*?\n(.*)$", re.DOTALL | re.MULTILINE)
_MEASUREMENT_RE = re.compile(
    r"\d+\.\s+\*\*`(?P<id>[^`]+)`\*\*\s+—\s+`judge:\s*(?P<judge>code|llm)`"
    r".*?Question:\s*\*(?P<question>.*?)\*"
    r".*?(?:Evaluator|Judge prompt):\s*```\n(?P<evaluator>.*?)\n\s*```",
    re.DOTALL,
)
_BASELINE_RE = re.compile(r"\*{0,2}Baseline:\*{0,2}\s*([0-9.]+|<unset[^>]*>)")
_PLATEAU_RE = re.compile(r"\*{0,2}Stop:\*{0,2}\s*(\d+)\s+iterations")


def parse_contract(path: Path) -> Contract:
    text = path.read_text()
    fm_match = _FRONTMATTER_RE.match(text)
    if not fm_match:
        raise ValueError(f"{path}: missing YAML frontmatter")
    frontmatter = yaml.safe_load(fm_match.group(1))
    body = fm_match.group(2)

    contract_match = _CONTRACT_RE.search(body)
    if not contract_match:
        raise ValueError(f"{path}: missing '## Contract' section")
    contract_text = contract_match.group(1)

    plateau_match = _PLATEAU_RE.search(contract_text)
    plateau = int(plateau_match.group(1)) if plateau_match else 10

    baseline_match = _BASELINE_RE.search(contract_text)
    baseline: float | None = None
    if baseline_match and not baseline_match.group(1).startswith("<"):
        baseline = float(baseline_match.group(1))

    measurements: list[Measurement] = []
    for m in _MEASUREMENT_RE.finditer(contract_text):
        measurements.append(
            Measurement(
                id=m.group("id"),
                question=m.group("question").strip(),
                judge=m.group("judge"),
                evaluator=m.group("evaluator").strip(),
            )
        )

    body_match = _SKILL_BODY_RE.search(body)
    lever_body = body_match.group(1).strip() if body_match else ""

    return Contract(
        name=frontmatter["name"],
        description=frontmatter["description"],
        objective_metric="mean pass rate",
        plateau_iterations=plateau,
        baseline=baseline,
        measurements=measurements,
        lever_body=lever_body,
    )
