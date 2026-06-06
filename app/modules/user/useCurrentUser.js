import { useEffect, useState } from 'react';
import { parseUser, parseUserValue } from 'app/modules/user';

export default function useCurrentUser() {
  const [user, setUser] = useState(() => parseUserValue());

  useEffect(() => {
    const sub = parseUser().subscribe(setUser);
    return () => sub.unsubscribe();
  }, []);

  return user;
}
