import { CardAlt, Page } from 'app/impacto-design-system';

import styles from './index.module.scss';

export default function QuickStart() {
  return (
    <Page header footer>
      <div className={styles.index}>
        <main>
          <h1 className={styles.title}>Welcome to Puente Manage</h1>
          <h2>Quick Start Guide</h2>

          <div className={styles.grid}>
            <CardAlt
              title="Form Creator"
              description="Create forms for Collect"
              nextLink="/forms/form-creator"
            />
            <CardAlt
              title="Form Manager"
              description="Manage forms for Collect"
              nextLink="/forms/form-manager"
            />
            <CardAlt
              title="Marketplace"
              description="Browse and install community forms"
              nextLink="/forms/form-marketplace"
            />
          </div>
        </main>
      </div>
    </Page>
  );
}
