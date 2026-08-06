const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Validates a Parse session token by calling Parse REST /users/me and
 * resolves the caller's identity and organization. The organization is the
 * server-side scoping value for every agent tool call — it must never come
 * from the client request body.
 */
const resolveUserFromSessionToken = async (sessionToken) => {
  if (!sessionToken) {
    throw httpError(401, 'Missing session token');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_parseServerUrl}/users/me`, {
    headers: {
      'X-Parse-Application-Id': process.env.NEXT_PUBLIC_parseAppId,
      'X-Parse-Session-Token': sessionToken,
    },
  });

  if (!response.ok) {
    throw httpError(401, 'Invalid session token');
  }

  const user = await response.json();

  if (!user.organization) {
    throw httpError(403, 'User has no organization');
  }

  return {
    userId: user.objectId,
    username: user.username,
    organization: user.organization,
  };
};

module.exports = { resolveUserFromSessionToken };
