import {
    Button, Text,
} from 'app/impacto-design-system';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import styles from './index.module.scss';

function Verify() {
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
    <div className={styles.auth}>
      <div className={styles.left} data-testid="auth-brand">
        <div className={styles.leftBrand}>
          <div className={styles.leftBrandMark}>P</div>
          <span className={styles.leftBrandName}>Puente</span>
        </div>
      </div>
      <div className={styles.right} data-testid="auth-form">
        <div className={styles.card}>
          <Text text={status} element="h1" className={styles.stack} />
          {status === 'Verified'
            && (
            <Button
              text="Continue"
              onClick={returnHome}
              isFullWidth
            />
            )}
        </div>
      </div>
    </div>
  );
}

export default Verify;
