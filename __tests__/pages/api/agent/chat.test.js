import handler from 'pages/api/agent/chat';

jest.mock('server/agent/auth', () => ({
  resolveUserFromSessionToken: jest.fn(),
}));
jest.mock('server/agent/agent', () => ({
  runAgent: jest.fn(),
}));
jest.mock('server/agent/rateLimit', () => ({
  checkRateLimit: jest.fn(() => true),
}));

const { resolveUserFromSessionToken } = require('server/agent/auth');
const { runAgent } = require('server/agent/agent');
const { checkRateLimit } = require('server/agent/rateLimit');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res;
};

describe('POST /api/agent/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const res = buildRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when the session token is invalid', async () => {
    resolveUserFromSessionToken.mockRejectedValue(
      Object.assign(new Error('Invalid session token'), { status: 401 }),
    );
    const res = buildRes();

    await handler(
      { method: 'POST', headers: { 'x-parse-session-token': 'bad' }, body: { messages: [] } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when messages are missing from the body', async () => {
    resolveUserFromSessionToken.mockResolvedValue({
      userId: 'u1', username: 'maria', organization: 'Puente-DR',
    });
    const res = buildRes();

    await handler(
      { method: 'POST', headers: { 'x-parse-session-token': 'ok' }, body: {} },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('runs the agent with the resolved org and session token — never from the body', async () => {
    resolveUserFromSessionToken.mockResolvedValue({
      userId: 'u1', username: 'maria', organization: 'Puente-DR',
    });
    runAgent.mockResolvedValue(undefined);
    const res = buildRes();
    const messages = [{ role: 'user', content: 'hola' }];

    await handler(
      {
        method: 'POST',
        headers: { 'x-parse-session-token': 'ok' },
        // A malicious body tries to override the org — it must be ignored.
        body: { messages, organization: 'SomeOtherOrg' },
      },
      res,
    );

    expect(runAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        organization: 'Puente-DR',
        sessionToken: 'ok',
        messages,
      }),
      res,
    );
  });

  it('returns 429 when the user exceeds the rate limit', async () => {
    resolveUserFromSessionToken.mockResolvedValue({
      userId: 'u1', username: 'maria', organization: 'Puente-DR',
    });
    checkRateLimit.mockReturnValueOnce(false);
    const res = buildRes();

    await handler(
      { method: 'POST', headers: { 'x-parse-session-token': 'ok' }, body: { messages: [] } },
      res,
    );

    expect(checkRateLimit).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(runAgent).not.toHaveBeenCalled();
  });
});
