"""Evaluate a JSON-spec code-judge measurement against one transcript.

The evaluator is a JSON document parsed and interpreted by a small
whitelisted tree walker. No `eval`, no `exec`.

Grammar:
    Atomic checks:
        {"type": "substring", "value": "<str>"}
        {"type": "regex", "pattern": "<str>", "flags": "<str>"}  # flags optional, "i" supported
        {"type": "count_gte", "value": "<str>", "n": <int>}
        {"type": "count_eq",  "value": "<str>", "n": <int>}
    Combinators:
        {"type": "all", "checks": [<check>, ...]}
        {"type": "any", "checks": [<check>, ...]}
        {"type": "not", "check": <check>}
"""

from __future__ import annotations

import json
import logging
import re

from scripts.parse_contract import Measurement


_log = logging.getLogger(__name__)


class InvalidSpecError(Exception):
    pass


def _check(spec: dict, transcript: str) -> bool:
    if not isinstance(spec, dict) or "type" not in spec:
        raise InvalidSpecError(f"spec must be a dict with a 'type' key: {spec!r}")
    t = spec["type"]

    if t == "substring":
        return spec["value"] in transcript
    if t == "regex":
        flags = re.IGNORECASE if "i" in spec.get("flags", "") else 0
        return re.search(spec["pattern"], transcript, flags) is not None
    if t == "count_gte":
        return transcript.count(spec["value"]) >= spec["n"]
    if t == "count_eq":
        return transcript.count(spec["value"]) == spec["n"]
    if t == "all":
        return all(_check(c, transcript) for c in spec["checks"])
    if t == "any":
        return any(_check(c, transcript) for c in spec["checks"])
    if t == "not":
        return not _check(spec["check"], transcript)

    raise InvalidSpecError(f"unknown check type: {t!r}")


def evaluate_code(measurement: Measurement, transcript: str) -> bool:
    try:
        spec = json.loads(measurement.evaluator)
    except json.JSONDecodeError as exc:
        _log.warning("measurement %s: invalid JSON: %s", measurement.id, exc)
        return False
    try:
        return _check(spec, transcript)
    except InvalidSpecError as exc:
        _log.warning("measurement %s: %s", measurement.id, exc)
        return False
    except Exception as exc:
        _log.warning("measurement %s: unexpected %s: %s", measurement.id, type(exc).__name__, exc)
        return False
