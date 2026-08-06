import { runAgent } from 'server/agent/agent';

jest.mock('ai', () => ({
  streamText: jest.fn(),
  stepCountIs: jest.fn((n) => ({ stepCount: n })),
}));
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((model) => ({ modelId: model })),
}));
jest.mock('server/agent/tools', () => ({
  buildTools: jest.fn(() => ({ countRecords: 'tool-stub' })),
}));
jest.mock('server/agent/prompt', () => ({
  buildSystemPrompt: jest.fn(() => 'SYSTEM PROMPT FOR Puente-DR'),
}));

const { streamText } = require('ai');
const { buildTools } = require('server/agent/tools');
const { buildSystemPrompt } = require('server/agent/prompt');

describe('runAgent', () => {
  const context = {
    userId: 'u1',
    username: 'maria',
    organization: 'Puente-DR',
    sessionToken: 'tok-1',
    messages: [{ role: 'user', content: 'hola' }],
  };

  let pipeUIMessageStreamToResponse;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeUIMessageStreamToResponse = jest.fn();
    streamText.mockReturnValue({ pipeUIMessageStreamToResponse });
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  it('builds tools scoped to the caller org and session token', async () => {
    await runAgent(context, res);
    expect(buildTools).toHaveBeenCalledWith({
      organization: 'Puente-DR',
      sessionToken: 'tok-1',
    });
  });

  it('streams with the system prompt, messages, and tools', async () => {
    await runAgent(context, res);
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ organization: 'Puente-DR', username: 'maria' }),
    );
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'SYSTEM PROMPT FOR Puente-DR',
        messages: context.messages,
        tools: { countRecords: 'tool-stub' },
      }),
    );
  });

  it('allows multi-step tool use', async () => {
    await runAgent(context, res);
    const args = streamText.mock.calls[0][0];
    expect(args.stopWhen).toBeDefined();
  });

  it('pipes the UI message stream to the HTTP response', async () => {
    await runAgent(context, res);
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalledWith(res);
  });
});
