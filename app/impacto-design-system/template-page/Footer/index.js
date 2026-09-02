import { useTranslation } from 'next-i18next';

import styles from './index.module.scss';

const Footer = () => {
  const { t } = useTranslation('common');
  return (
    <div className={styles.footer}>
      <footer>
        <a
          href="https://www.puente-dr.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/assets/brand/logo-blue-tech.png"
            alt={t('footer_logo_alt')}
            className={styles.logo}
          />
          {t('footer_tagline')}
        </a>
      </footer>
    </div>
  );
};

export default Footer;
