# html-discussion

A script-driven, byte-addressable HTML discussion and planning artifact generator.

It allows AI agents to create, organize, and dynamically evolve structured HTML pages over the lifecycle of a task (such as roadmaps, spikes, comparison matrices, and visual callouts) without bloated prompt reads/writes.

---

## Key Features

1. **Byte-Addressable Sections**: Sections are managed via fast CLI shell scripts under `bin/` so agents only replace the relevant byte-offset blocks instead of rewriting a large 30KB HTML file.
2. **Beautiful Responsive Themes**: Built-in, fully customizable themes (like modern dark neomorphism `tactile.css` or high-quality glassmorphism `liquid-glass.css`).
3. **Structured Blueprints & Snippets**: Ready-to-use snippets for Options grids, Deliverable checklists, Test plans, Compare tables, and Timeline steps.

---

## Installation

Install using the `skills` CLI:

```bash
# Project-scoped (recommended)
npx skills add fourcolors/skills --skill html-discussion -a claude-code

# Global user-scoped
npx skills add fourcolors/skills --skill html-discussion -g
```

---

## Bootstrapping Custom Slash Commands

AI coding assistants (like Claude Code) expect custom command definitions to live in `.claude/commands/` (project-local) or `~/.claude/commands/` (global). To register the `/discussion` and `/crystallize` commands, copy them after installation:

### For Project-scoped Installations:
```bash
mkdir -p .claude/commands
cp .claude/skills/html-discussion/commands/*.md .claude/commands/
```

### For Global Installations:
```bash
mkdir -p ~/.claude/commands
cp ~/.claude/skills/html-discussion/commands/*.md ~/.claude/commands/
```

*Note: You may need to restart your AI assistant's session after copying the command files for the new slash commands to register.*

---

## Usage Workflow

Once installed, your AI agent can manage pages under `docs/discussions/` by executing the following terminal commands:

### 1. Create a New Discussion Page
```bash
# Creates a draft page + manifest JSON file
./bin/new-page.sh my-feature-pitch --theme liquid-glass
```

### 2. Append Content Snippets
```bash
# Appends an Option compare table or deliverable check list
./bin/add-section.sh my-feature-pitch compare-table --fills title="Options Compare",col1="Approach A",col2="Approach B"
```

### 3. Reorder or Manage Sections
```bash
# Move or swap sections cleanly via byte-anchors
./bin/move.sh my-feature-pitch 02-deliverables --before 01-header
```

### 4. Render and Ship
```bash
# Compile everything, flip status to shipped, and update project index
./bin/ship-page.sh my-feature-pitch --commit HEAD
```

---

## Directory Layout

```text
.claude/skills/html-discussion/
├── SKILL.md
├── README.md
├── bin/                 <-- Shell scripts to mutate manifests & html
│   ├── new-page.sh
│   ├── list.sh
│   ├── add-section.sh
│   ├── move.sh
│   ├── render.sh
│   └── ship-page.sh
├── snippets/            <-- Slots and structural blueprints
│   ├── header.html
│   ├── compare-table.html
│   └── grid-3-cards.html
├── themes/              <-- Modular CSS visual layouts
│   ├── plex-paper.css
│   ├── tactile.css
│   └── liquid-glass.css
└── commands/            <-- Custom slash command definitions
    ├── crystallize.md   <-- Propose & apply canonical spec changes
    └── discussion.md    <-- Scaffold, view, and ship threads
```
