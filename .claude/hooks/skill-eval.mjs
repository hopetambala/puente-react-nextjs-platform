#!/usr/bin/env node
/**
 * UserPromptSubmit hook — mandatory skill evaluation.
 *
 * Adapted from Alex Op's "custom TDD workflow for Claude Code" pattern. Before
 * each response, this injects an instruction forcing Claude to evaluate every
 * available skill (YES/NO + reason) and activate the relevant ones via the
 * Skill() tool BEFORE implementing. In the original write-up this lifted skill
 * activation from ~20% to ~84%.
 *
 * Skills are discovered live from .claude/skills/*\/SKILL.md so the list never
 * goes stale. Output is emitted as additionalContext for the UserPromptSubmit
 * event. The hook never blocks (always exits 0); on any error it stays silent.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

// Pull `name:` and the first sentence of the folded `description:` block.
function parseSkill(md) {
  const nameMatch = md.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : null;
  if (!name) return null;

  let desc = '';
  const lines = md.split('\n');
  const descIdx = lines.findIndex((l) => /^description:\s*>?/.test(l));
  if (descIdx !== -1) {
    const inline = lines[descIdx].replace(/^description:\s*>?\s*/, '').trim();
    if (inline) {
      desc = inline;
    } else {
      const body = [];
      for (let i = descIdx + 1; i < lines.length; i += 1) {
        if (/^\S/.test(lines[i])) break; // dedented → end of folded block
        body.push(lines[i].trim());
      }
      desc = body.join(' ').trim();
    }
  }
  const firstSentence = desc.split(/(?<=\.)\s/)[0] || desc;
  return { name, hint: firstSentence.slice(0, 160) };
}

function discoverSkills() {
  const skillsRoot = join(projectDir(), '.claude', 'skills');
  let dirs = [];
  try {
    dirs = readdirSync(skillsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
  const skills = [];
  for (const dir of dirs) {
    try {
      const md = readFileSync(join(skillsRoot, dir, 'SKILL.md'), 'utf8');
      const parsed = parseSkill(md);
      if (parsed) skills.push(parsed);
    } catch {
      /* skip unreadable skill */
    }
  }
  return skills;
}

function buildInstruction(skills) {
  const list = skills
    .map((s) => `  - ${s.name}: ${s.hint}`)
    .join('\n');

  return [
    'INSTRUCTION: MANDATORY SKILL EVALUATION (do this before implementing)',
    '',
    'Available project skills:',
    list,
    '',
    'Step 1 — EVALUATE: for each skill above, state "[name] — YES/NO — [reason]".',
    'Step 2 — ACTIVATE: for every YES, call the Skill() tool NOW.',
    'Step 3 — IMPLEMENT: only after Step 2.',
    '',
    'Rule of thumb: any change to a function, component, page, epic, hook, or a',
    'bug fix MUST go through red-green-tdd (test written and seen failing first).',
    'Any styling change MUST honor dlite-design-system. Do not skip to',
    'implementation without evaluating these.',
  ].join('\n');
}

function main() {
  // Drain stdin (the hook event payload); we don't need its contents here.
  try {
    readFileSync(0, 'utf8');
  } catch {
    /* no stdin */
  }

  const skills = discoverSkills();
  if (skills.length === 0) {
    process.exit(0);
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: buildInstruction(skills),
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main();
