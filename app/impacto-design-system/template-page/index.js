import parseService from 'app/services/parse';
import React from 'react';

import Footer from './Footer';
import Header from './Header';
import styles from './index.module.scss';

export default function Page({ header, footer, children }) {
  React.useEffect(() => {
    parseService.initialize();
  }, []);

  return (
    <div className={styles.page}>
      {header
        ? (
          <Header>
            {children}
          </Header>
        )
        : (
          <div>
            {children}
          </div>
        )}
      {footer
        ? <Footer />
        : <div />}
    </div>
  );
}
