import FormMarketplace from 'app/components/epics/FormMarketplace';
import Page from 'app/components/templates/dashboard-layout';
import { useGlobalState } from 'app/store/global.context';
import { useRouter } from 'next/router';

import styles from './index.module.scss';

export default function Marketplace() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();

  return (
    <Page
      header
      footer
    >
      <main className={styles.formMarketplace}>
        <div className={styles.container}>
          <FormMarketplace
            router={router}
            context={contextManagment}
          />
        </div>
      </main>
    </Page>
  );
}
