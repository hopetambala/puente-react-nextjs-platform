import {
  Button, Card, Text,
} from 'app/components/design-system/elements';
import Page from 'app/components/templates/dashboard-layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import styles from './index.module.scss';

const Verify = () => {
  const router = useRouter();

  const { objectId: userId } = router.query;

  const [status, setStatus] = useState();

  const returnHome = () => {
    router.push('/account/login');
  };

  useEffect(() => {
    // http://localhost:3000/account/verify?objectId=AyplFWVebA
    const verify = async () => {
      if (userId) setStatus('Verified');
    };
    verify();
    if (!userId) setStatus('Error');
  }, [userId]);

  return (
    <Page>
      <div className={styles.paper}>
        <Card padding="extraLarge">
          <Text text={status} element="h1" className={styles.stack} />
          {status === 'Verified'
            && (
            <Button
              text="Continue"
              onClick={returnHome}
              isFullWidth
            />
            )}
        </Card>
      </div>
    </Page>
  );
};

export default Verify;
