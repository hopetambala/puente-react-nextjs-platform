import { runAgent } from 'server/agent/agent';
import { resolveUserFromSessionToken } from 'server/agent/auth';
import { checkRateLimit } from 'server/agent/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let user;
  try {
    user = await resolveUserFromSessionToken(req.headers['x-parse-session-token']);
  } catch (error) {
    res.status(error.status || 401).json({ error: error.message });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  if (!checkRateLimit(user.userId)) {
    res.status(429).json({ error: 'Too many requests — please wait a minute' });
    return;
  }

  // Org and session token come ONLY from the validated session — never the body.
  await runAgent(
    {
      userId: user.userId,
      username: user.username,
      organization: user.organization,
      sessionToken: req.headers['x-parse-session-token'],
      messages,
    },
    res,
  );
}
