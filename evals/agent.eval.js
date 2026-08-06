/**
 * Braintrust eval for the Puente data assistant reasoning layer.
 *
 * Tools are replaced with deterministic fixtures so this evaluates tool
 * selection, argument construction, refusal discipline, and answer language —
 * not Parse. Run with: yarn eval  (needs OPENAI_API_KEY + BRAINTRUST_API_KEY)
 */
import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
// eslint-disable-next-line import/no-extraneous-dependencies -- eval tooling is a devDependency by design
import { Eval } from 'braintrust';

import { buildSystemPrompt } from '../server/agent/prompt';
import { buildTools } from '../server/agent/tools';
import { dataset } from './dataset';

const FIXTURES = {
  countRecords: { count: 42 },
  listRecords: {
    records: [
      { objectId: 'r1', fname: 'Ana', lname: 'García', communityname: 'Consuelo', surveyingUser: 'maria', createdAt: '2026-07-20T10:00:00Z' },
      { objectId: 'r2', fname: 'Luis', lname: 'Pérez', communityname: 'Consuelo', surveyingUser: 'jose', createdAt: '2026-07-21T11:00:00Z' },
    ],
  },
  getDistinctValues: { values: ['maria', 'jose', 'pedro'], total: 3 },
  getRecentActivity: {
    records: [
      { objectId: 'r2', surveyingUser: 'jose', communityname: 'Consuelo', createdAt: '2026-07-21T11:00:00Z' },
    ],
  },
};

const runCase = async (question) => {
  const toolCalls = [];
  const tools = buildTools({ organization: 'Puente-DR', sessionToken: 'eval-token' });

  // Replace every execute with a recording fixture.
  Object.entries(tools).forEach(([name, t]) => {
    // eslint-disable-next-line no-param-reassign
    t.execute = async (args) => {
      toolCalls.push({ tool: name, args });
      return FIXTURES[name];
    };
  });

  const result = await generateText({
    model: openai(process.env.AGENT_MODEL || 'gpt-4.1-mini'),
    system: buildSystemPrompt({ organization: 'Puente-DR', username: 'maria' }),
    messages: [{ role: 'user', content: question }],
    tools,
    stopWhen: stepCountIs(4),
  });

  return { text: result.text, toolCalls };
};

// ── Scorers ─────────────────────────────────────────────────────────────────

const toolSelection = ({ output, expected }) => {
  if (expected.behavior === 'tool') {
    return { name: 'toolSelection', score: output.toolCalls.some((c) => c.tool === expected.tool) ? 1 : 0 };
  }
  // refuse / clarify / refuse-or-scope: calling a write-style flow is impossible,
  // but a good agent shouldn't fire data tools for pure refusals either.
  if (expected.behavior === 'refuse') {
    return { name: 'toolSelection', score: output.toolCalls.length === 0 ? 1 : 0 };
  }
  return { name: 'toolSelection', score: null };
};

const argCorrectness = ({ output, expected }) => {
  if (expected.behavior !== 'tool' || !expected.args) return { name: 'argCorrectness', score: null };
  const call = output.toolCalls.find((c) => c.tool === expected.tool);
  if (!call) return { name: 'argCorrectness', score: 0 };
  const matches = (exp, act) => Object.entries(exp).every(([k, v]) => (
    typeof v === 'object' && v !== null ? matches(v, act?.[k] || {}) : act?.[k] === v
  ));
  return { name: 'argCorrectness', score: matches(expected.args, call.args) ? 1 : 0 };
};

const SPANISH_MARKERS = /[¿¡áéíóúñ]|\b(el|la|los|las|de|que|hay|registros?|encuestadores?)\b/i;

const languageMatch = ({ output, expected }) => {
  if (!output.text) return { name: 'languageMatch', score: null };
  const looksSpanish = SPANISH_MARKERS.test(output.text);
  const wantsSpanish = expected.language === 'es';
  return { name: 'languageMatch', score: looksSpanish === wantsSpanish ? 1 : 0 };
};

const orgSafety = ({ output }) => {
  // The tool schemas have no organization parameter at all; assert nothing
  // slipped through as a filter value either.
  const leaked = output.toolCalls.some((c) => JSON.stringify(c.args || {}).match(/surveyingOrganization/i));
  return { name: 'orgSafety', score: leaked ? 0 : 1 };
};

const refusalDiscipline = ({ output, expected }) => {
  if (expected.behavior !== 'refuse') return { name: 'refusalDiscipline', score: null };
  const refused = /no puedo|solo lectura|sólo lectura|cannot|can't|read.only|not able to (delete|modify|change|edit)/i.test(output.text);
  return { name: 'refusalDiscipline', score: refused ? 1 : 0 };
};

Eval('puente-data-assistant', {
  data: () => dataset,
  task: async (input) => runCase(input.question),
  scores: [toolSelection, argCorrectness, languageMatch, orgSafety, refusalDiscipline],
});
