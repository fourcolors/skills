from pathlib import Path

from scripts.parse_contract import Contract, Measurement, parse_contract


FIXTURE = Path(__file__).parent / "fixtures" / "good_skill.md"


def test_parses_name_and_description():
    c = parse_contract(FIXTURE)
    assert c.name == "example-skill"
    assert "testing the parser" in c.description


def test_parses_objective_baseline():
    c = parse_contract(FIXTURE)
    assert c.objective_metric == "mean pass rate"
    assert c.plateau_iterations == 10
    assert c.baseline == 0.42


def test_parses_two_measurements():
    c = parse_contract(FIXTURE)
    assert len(c.measurements) == 2


def test_first_measurement_is_code_judge_with_json_spec():
    c = parse_contract(FIXTURE)
    m1 = c.measurements[0]
    assert m1.id == "m1-fired-when-expected"
    assert m1.judge == "code"
    assert '"type": "substring"' in m1.evaluator
    assert '"example-skill"' in m1.evaluator


def test_second_measurement_is_llm_judge():
    c = parse_contract(FIXTURE)
    m2 = c.measurements[1]
    assert m2.id == "m2-output-matched"
    assert m2.judge == "llm"
    assert "yes or no" in m2.evaluator


def test_extracts_lever_body():
    c = parse_contract(FIXTURE)
    assert "The body of the skill goes here." in c.lever_body
