import { buildSystemPrompt } from './prompt';
import { buildTools } from './tools';

/**
 * Runs the data assistant agent and streams the result to the HTTP response.
 *
 * The 'ai' and '@ai-sdk/openai' packages are ESM-only, so they are loaded via
 * dynamic import to stay compatible with this CommonJS server module.
 */
const runAgent = async (context, res) => {
  const { streamText, stepCountIs } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');

  const { username, organization, sessionToken, messages } = context;

  const result = streamText({
    model: openai(process.env.AGENT_MODEL || 'gpt-4.1-mini'),
    system: buildSystemPrompt({ organization, username }),
    messages,
    tools: buildTools({ organization, sessionToken }),
    stopWhen: stepCountIs(6),
  });

  result.pipeUIMessageStreamToResponse(res);
};

export { runAgent };
export default runAgent;
