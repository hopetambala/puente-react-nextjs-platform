import FormCreator from 'app/components/epics/FormCreator';
import Page from 'app/components/templates/dashboard-layout';
import { UserContext } from 'app/store/auth.context';
import { useGlobalState } from 'app/store/global.context';
import { useContext } from 'react';

import styles from './index.module.scss';

export default function Forms() {
  const { contextManagment } = useGlobalState();
  const {
    user, isLoading: isUserLoading, error: userError,
  } = useContext(UserContext);

  return (
    <Page
      header
      footer
    >
      <main className={styles.formCreator}>
        <div className={styles.container}>
          <FormCreator
            context={contextManagment}
            user={user}
            isUserLoading={isUserLoading}
            userError={userError}
          />
        </div>
      </main>
    </Page>
  );
}
