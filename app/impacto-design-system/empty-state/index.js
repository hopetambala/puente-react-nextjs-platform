import PropTypes from 'prop-types';
import styles from './empty-state.module.css';

export default function EmptyState({ message, sub }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.message}>{message}</p>
      {sub && <p className={styles.sub}>{sub}</p>}
    </div>
  );
}

EmptyState.defaultProps = {
  sub: null,
};

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  sub: PropTypes.string,
};
