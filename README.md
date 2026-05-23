# fourcolors skills

A small skillpack of reusable Claude Code / agent skills maintained by fourcolors.

This repository is intended to be installable with the open `skills` CLI:

```bash
npx skills add fourcolors/skills --list
npx skills add fourcolors/skills --skill scratch -a claude-code
```

## Skills

| Skill | Description |
|---|---|
| [`scratch`](./skills/scratch) | A convention for project-local `.scratch/` folders: ad-hoc executable scripts, review notes, generated artifacts, and temporary pipeline outputs. |

## Repository layout

```text
skills/
└── scratch/
    ├── SKILL.md
    └── templates/
```

Each skill is a directory containing a `SKILL.md` file. Human-facing notes should live in the skill's `README.md`; agent-facing instructions live in `SKILL.md`.

## Development

List discoverable skills before publishing or after changes:

```bash
npx skills add . --list
```

Install locally into Claude Code for testing:

```bash
npx skills add . --skill scratch -a claude-code
```

