import FormManager from 'app/epics/FormManager';
import { Page, Text } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';
import { useGlobalState } from 'app/store';
import { useRouter } from 'next/router';

import styles from './index.module.scss';

export default function Manager() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const user = parseUserValue();

  return (
    <Page header footer>
      <main className={styles.page}>
        <div className={styles.header}>
          <Text element="h1" text="Form Manager" />
          <Text element="p" text="Create, manage, and export your data collection forms." />
        </div>
        <FormManager
          router={router}
          context={contextManagment}
          user={user}
        />
      </main>
    </Page>
  );
}
