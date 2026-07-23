"""Render a Contract into a SKILL.md from the template."""

from __future__ import annotations

from pathlib import Path

from scripts.parse_contract import Contract, Measurement


_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "skill.md.template"
_MEASUREMENT_BLOCK = """{index}. **`{id}`** — `judge: {judge}`
   - Question: *{question}*
   - {evaluator_label}:
     ```
     {evaluator}
     ```
"""


def _render_measurement(index: int, m: Measurement) -> str:
    label = "Judge prompt" if m.judge == "llm" else "Evaluator"
    return _MEASUREMENT_BLOCK.format(
        index=index,
        id=m.id,
        judge=m.judge,
        question=m.question,
        evaluator_label=label,
        evaluator=m.evaluator,
    )


def write_new_skill(contract: Contract, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    (target.parent / "snapshots").mkdir(exist_ok=True)
    (target.parent / "corpus").mkdir(exist_ok=True)

    template = _TEMPLATE_PATH.read_text()
    measurements_block = "\n".join(
        _render_measurement(i + 1, m) for i, m in enumerate(contract.measurements)
    )
    baseline_str = (
        f"{contract.baseline}" if contract.baseline is not None else "<unset — filled by first scoring run>"
    )

    rendered = (
        template.replace("{{name}}", contract.name)
        .replace("{{description}}", contract.description)
        .replace("{{plateau_iterations}}", str(contract.plateau_iterations))
        .replace("{{baseline}}", baseline_str)
        .replace("{{measurements_block}}", measurements_block.strip())
        .replace("{{body}}", contract.lever_body or "<skill body to be filled in>")
    )

    target.write_text(rendered)
