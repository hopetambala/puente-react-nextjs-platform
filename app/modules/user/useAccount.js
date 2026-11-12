import { useCallback, useEffect, useState } from 'react';

import { authErrorKey } from './authErrors';
import { retrieveUserByObjectId } from './index';

/**
 * Load a _User's editable details, or say why they couldn't be loaded.
 *
 * Design review C7: a failed lookup left Account Settings on a spinner forever
 * (and threw "Object not found" in dev). Pages show `errorKey` (a catalog key
 * from authErrorKey) with a Retry that calls `retry`, and send an expired
 * session (`auth_error_session`) to sign-in.
 *
 * @param {string|undefined} userId
 * @param {string[]} fields  the attributes to read; missing ones become ''
 */
export function useAccount(userId, fields) {
  const [account, setAccount] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [attempt, setAttempt] = useState(0);
  const fieldList = fields.join(',');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }
    let ignore = false;
    setLoading(true);
    setErrorKey(null);
    retrieveUserByObjectId(userId)
      .then(({ attributes }) => {
        if (ignore) return;
        setAccount(Object.fromEntries(fieldList.split(',').map((f) => [f, attributes?.[f] ?? ''])));
      })
      .catch((e) => { if (!ignore) setErrorKey(authErrorKey(e)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [userId, fieldList, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    account, errorKey, loading, retry,
  };
}

export default useAccount;
