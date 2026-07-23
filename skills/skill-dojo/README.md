# skill-dojo

A "sensei" skill that authors new Claude Code skills with embedded
evaluation contracts.

It grills you on purpose, writes a self-contained `SKILL.md` with
measurable pass/fail checks, scores once against a seed corpus, and
hands off a baseline. A sister skill (`skill-reflector`, planned)
would later iterate the editable lever using a keep-winner loop.

## Install

Via the [skills CLI](https://skills.sh):

```bash
npx skills add fourcolors/skills --skill skill-dojo -a claude-code
```

Or clone this repo and symlink:

```bash
ln -s "$(pwd)/skills/skill-dojo" ~/.claude/skills/skill-dojo
```

Claude Code discovers skills under `~/.claude/skills/` automatically.

## Invoke

Describe a skill you want to build, or type `/skill-dojo`.
The sensei runs a seven-step grill, writes `SKILL.md`, runs a
first-pass evaluation against a seed corpus, and reports a baseline.

## Dependencies

Python 3.11+ for the helper scripts under `scripts/`.

```bash
cd path/to/skill-dojo
pip install -e ".[dev]"
pytest
```

- `anthropic` is required only if you use LLM-judged measurements
  (set `ANTHROPIC_API_KEY`).
- Code-judge measurements need no API key.

## Layout

```text
skill-dojo/
├── SKILL.md              # Agent-facing sensei workflow + self-contract
├── README.md             # This file
├── pyproject.toml        # Python package for scripts/tests
├── templates/
│   └── skill.md.template # Skeleton for skills the dojo authors
├── scripts/
│   ├── parse_contract.py
│   ├── judge_code.py
│   ├── judge_llm.py
│   ├── score.py
│   ├── fetch_corpus.py
│   └── new_skill.py
└── tests/
```

## License

MIT (same as the parent `fourcolors/skills` repository).
