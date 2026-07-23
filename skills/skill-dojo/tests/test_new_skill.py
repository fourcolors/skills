from pathlib import Path

from scripts.new_skill import write_new_skill
from scripts.parse_contract import Contract, Measurement, parse_contract


def _sample_contract() -> Contract:
    return Contract(
        name="foo-skill",
        description="Use when foo",
        objective_metric="mean pass rate",
        plateau_iterations=10,
        baseline=None,
        measurements=[
            Measurement(
                id="m1-fired",
                question="Did it fire?",
                judge="code",
                evaluator='{"type": "substring", "value": "foo"}',
            ),
            Measurement(
                id="m2-correct",
                question="Was it correct?",
                judge="llm",
                evaluator="Was the output correct? yes or no.",
            ),
        ],
        lever_body="The body of foo-skill.",
    )


def test_writes_file_at_expected_path(tmp_path):
    target = tmp_path / "foo-skill" / "SKILL.md"
    write_new_skill(_sample_contract(), target)
    assert target.exists()


def test_round_trip_parse(tmp_path):
    target = tmp_path / "foo-skill" / "SKILL.md"
    write_new_skill(_sample_contract(), target)
    parsed = parse_contract(target)
    assert parsed.name == "foo-skill"
    assert len(parsed.measurements) == 2
    assert parsed.measurements[0].id == "m1-fired"
    assert parsed.measurements[1].judge == "llm"
    # Verify baseline and plateau survive the round-trip
    assert parsed.plateau_iterations == 10
    # baseline=None in _sample_contract() → renders as "<unset...>" → parses back as None
    assert parsed.baseline is None


def test_round_trip_parse_with_set_baseline(tmp_path):
    """Confirms a numeric baseline survives the round-trip through bold markdown."""
    target = tmp_path / "foo-skill" / "SKILL.md"
    contract = _sample_contract()
    contract.baseline = 0.55
    contract.plateau_iterations = 7
    write_new_skill(contract, target)
    parsed = parse_contract(target)
    assert parsed.baseline == 0.55
    assert parsed.plateau_iterations == 7


def test_baseline_unset_renders_placeholder(tmp_path):
    target = tmp_path / "bar-skill" / "SKILL.md"
    write_new_skill(_sample_contract(), target)
    content = target.read_text()
    assert "<unset" in content


def test_baseline_set_renders_number(tmp_path):
    contract = _sample_contract()
    contract.baseline = 0.42
    target = tmp_path / "bar-skill" / "SKILL.md"
    write_new_skill(contract, target)
    content = target.read_text()
    assert "- **Baseline:** 0.42" in content


def test_creates_snapshots_and_corpus_dirs(tmp_path):
    target = tmp_path / "foo-skill" / "SKILL.md"
    write_new_skill(_sample_contract(), target)
    assert (target.parent / "snapshots").is_dir()
    assert (target.parent / "corpus").is_dir()
