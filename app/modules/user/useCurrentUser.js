import { useEffect, useState } from 'react';
import userModule from 'app/modules/user';

export default function useCurrentUser() {
  const [user, setUser] = useState(() => userModule.parseUserValue());

  useEffect(() => {
    const sub = userModule.parseUser().subscribe(setUser);
    return () => sub.unsubscribe();
  }, []);

  return user;
}
