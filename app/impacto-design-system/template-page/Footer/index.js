import styles from './index.module.scss';

const Footer = () => (
  <div className={styles.footer}>
    <footer>
      <a
        href="https://www.puente-dr.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="/assets/brand/logo-blue-tech.png"
          alt="Vercel Logo"
          className={styles.logo}
        />
        Building the bridge between data and development since 2017
      </a>
    </footer>
  </div>
);

export default Footer;
