import { parseUser, parseUserValue } from 'app/modules/user';
import { useEffect, useState } from 'react';

export default function useCurrentUser() {
  const [user, setUser] = useState(() => parseUserValue());

  useEffect(() => {
    const sub = parseUser().subscribe(setUser);
    return () => sub.unsubscribe();
  }, []);

  return user;
}
