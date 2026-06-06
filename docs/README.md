# Puente Manage — Claude Code automation

This directory documents the project's Claude Code setup: the **skills**,
**subagents**, and **hooks** that live under [`.claude/`](../.claude) and shape
how Claude works in this repo. It is reference material for humans — the files
themselves are what Claude actually reads.

```
.claude/
├── settings.json                       # wires the hook (committed, team-wide)
├── hooks/
│   └── skill-eval.mjs                   # UserPromptSubmit → forces skill evaluation
├── skills/
│   ├── red-green-tdd/SKILL.md           # TDD orchestrator (drives the 3 agents)
│   ├── dlite-design-system/SKILL.md     # design-token enforcement
│   │   └── scan.mjs                      #   token/utility scanner (+ --fix)
│   └── visual-qa/SKILL.md               # screenshot-based visual QA
│       └── screenshot.mjs                #   Playwright runner
└── agents/
    ├── tdd-test-writer.md               # RED  phase
    ├── tdd-implementer.md               # GREEN phase
    └── tdd-refactorer.md                # REFACTOR phase
```

## How it fits together

These three layers reinforce each other:

1. **Hook** (`skill-eval.mjs`) fires on every prompt and tells Claude to
   evaluate the available skills *before* implementing — so the right skill
   actually gets used instead of being forgotten.
2. **Skills** are the standing rules / workflows. `red-green-tdd` and
   `dlite-design-system` are effectively mandatory for code and styling
   respectively; `visual-qa` is on-demand.
3. **Agents** are the workers the `red-green-tdd` skill orchestrates, each in an
   isolated context so the TDD phases can't pollute one another.

The TDD pipeline end-to-end:

```
prompt ─▶ hook injects "evaluate skills" ─▶ Claude activates red-green-tdd
                                                      │
                  ┌───────────────────────────────────┘
                  ▼
   Phase 1 RED ──▶ tdd-test-writer   ─▶ failing test  ──┐ GATE 1: red for the right reason?
                                                          ▼
   Phase 2 GREEN ─▶ tdd-implementer  ─▶ passing test  ──┐ GATE 2: test passes?
                                                          ▼
   Phase 3 REFACTOR ▶ tdd-refactorer ─▶ clean + green  ─▶ done (full suite + build)
```

---

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`. Each has YAML frontmatter
(`name`, `description`) that tells Claude *when* to use it, followed by the
instructions. Some ship a helper script alongside.

### `red-green-tdd` — test-first orchestrator
- **When:** any new or changed behavior — function, component, page, epic, hook,
  or a bug fix.
- **What it does:** orchestrates strict Red → Green → Refactor across the three
  TDD subagents (below), with hard gates between phases. A change that lands
  without a test that was *seen failing first* is not done.
- **Backed by:** the user memory `feedback_tdd_first.md` (the standing rule).
- **File:** [`.claude/skills/red-green-tdd/SKILL.md`](../.claude/skills/red-green-tdd/SKILL.md)

### `dlite-design-system` — design-token enforcement
- **When:** writing/editing any `*.module.(css|scss)` or JSX `className` /
  inline `style`.
- **What it does:** enforces the `--tk-dlite-*` design tokens and `.cl-dlite-*`
  utility classes from `style-dictionary-dlite-tokens` instead of raw
  hex/px/hand-rolled layout. Also says when a token itself is wrong/missing so
  it gets fixed at the source rather than worked around.
- **Helper:** `node .claude/skills/dlite-design-system/scan.mjs [path]` reports
  violations with `file:line` and the token replacement. `--fix` auto-applies
  only the value-preserving swaps (exact hex/px → token); ambiguous cases stay
  manual.
- **File:** [`.claude/skills/dlite-design-system/SKILL.md`](../.claude/skills/dlite-design-system/SKILL.md)

### `visual-qa` — screenshot-based visual QA
- **When:** auditing the running app's visual quality or verifying a redesign
  change in the browser.
- **What it does:** runs Playwright headlessly, logs in, screenshots every
  authenticated page to `.claude/screenshots/`, then reads them back to diagnose
  and fix defects.
- **Helper:** with `yarn dev` running on port 3000:
  `PARSE_USERNAME=Test PARSE_PASSWORD=test node .claude/skills/visual-qa/screenshot.mjs`
  (1440×900 @ 2× DPR).
- **File:** [`.claude/skills/visual-qa/SKILL.md`](../.claude/skills/visual-qa/SKILL.md)

---

## Agents

Subagents live in `.claude/agents/<name>.md` with frontmatter (`name`,
`description`, `tools`) and a body that is the agent's system prompt. They are
invoked by name as the `subagent_type` of the Agent tool — normally by the
`red-green-tdd` orchestrator, one phase at a time, each in its **own isolated
context**. That isolation is the point: the test writer never sees the planned
implementation, and the implementer sees only a failing test.

### `tdd-test-writer` — RED
- Writes **one failing test** for a single behavior in `__tests__/` (mirroring
  the source path), then proves it fails *for the right reason*.
- Reuses neighboring tests' mock conventions (design-system prop API, Parse
  query chain, `next/router`, `next-i18next`).
- **Never** writes production code. Returns: test path, failure output, one-line
  summary — and nothing that would leak implementation.
- **Tools:** Read, Grep, Glob, Write, Edit, Bash.
- **File:** [`.claude/agents/tdd-test-writer.md`](../.claude/agents/tdd-test-writer.md)

### `tdd-implementer` — GREEN
- Receives **only** the failing-test path + its output, and writes the *minimum*
  code to pass. Re-runs until green.
- **Never** edits tests; if it thinks a test is wrong it reports back rather than
  changing it. Returns: modified files, passing output, summary.
- **Tools:** Read, Grep, Glob, Write, Edit, Bash.
- **File:** [`.claude/agents/tdd-implementer.md`](../.claude/agents/tdd-implementer.md)

### `tdd-refactorer` — REFACTOR
- With tests green, applies behavior-preserving cleanups (dedup, naming, dlite
  tokens) **or** returns "No refactoring needed" — skipping is a valid outcome,
  over-engineering is a defect. Re-runs the full suite to confirm still green.
- **Never** changes behavior or edits tests. **Tools:** Read, Grep, Glob, Edit,
  Bash.
- **File:** [`.claude/agents/tdd-refactorer.md`](../.claude/agents/tdd-refactorer.md)

> Lineage: this three-agent + orchestrator + hook design is adapted from Alex
> Op's "custom TDD workflow for Claude Code" write-up, ported from Vue/Vitest to
> our Next.js / Jest / React Testing Library stack.

---

## Hooks

Hooks are shell commands the Claude Code harness runs on lifecycle events,
configured in [`.claude/settings.json`](../.claude/settings.json).

### `skill-eval.mjs` — `UserPromptSubmit`
- **Event:** fires when you submit a prompt, before Claude responds.
- **What it does:** auto-discovers the skills in `.claude/skills/*/SKILL.md`
  (name + first line of description) and injects a "MANDATORY SKILL EVALUATION"
  instruction as `additionalContext` — forcing Claude to state YES/NO per skill
  and activate the relevant ones before implementing. In the original write-up
  this lifted skill activation from ~20% to ~84%.
- **Plain Node**, no TypeScript dependency. Auto-discovery means new skills are
  picked up with no edit to the hook. Always exits 0 (never blocks); silent on
  error.
- **Files:** [`.claude/hooks/skill-eval.mjs`](../.claude/hooks/skill-eval.mjs),
  wired in [`.claude/settings.json`](../.claude/settings.json).
- **Note:** hook changes take effect on the next session / settings reload, and
  Claude Code may ask you to approve the hook command the first time.

---

## Extending the setup

- **Add a skill:** create `.claude/skills/<name>/SKILL.md` with `name` +
  `description` frontmatter. The hook discovers it automatically — no other
  wiring needed. Add a sibling script if it needs tooling.
- **Add an agent:** create `.claude/agents/<name>.md` with `name`,
  `description`, `tools` frontmatter and a system-prompt body. Reference it from
  a skill (or invoke it directly) by its `name` as `subagent_type`.
- **Add a hook:** add the script under `.claude/hooks/`, register it in
  `.claude/settings.json` under the right event, and keep it non-blocking
  (exit 0) unless you intend a hard gate. The `update-config` skill can help
  with `settings.json` edits.
- **Keep this README in sync** when you change any of the above.
