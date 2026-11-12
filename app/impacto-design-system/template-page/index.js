import parseService from 'app/services/parse';
import PropTypes from 'prop-types';
import { useEffect } from 'react';

import styles from './index.module.scss';

/**
 * A bare page outside the signed-in AppShell (reset-login, verify redirect):
 * the page's <main> landmark and nothing else. Its never-rendered drawer
 * header and footer were removed with the overhaul's dead-code sweep.
 */
export default function Page({ children }) {
  useEffect(() => {
    parseService.initialize();
  }, []);

  return <main className={styles.page}>{children}</main>;
}

Page.propTypes = {
  children: PropTypes.node.isRequired,
};
