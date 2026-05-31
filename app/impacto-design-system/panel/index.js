import PropTypes from 'prop-types';
import styles from './panel.module.css';

export default function Panel({ title, action, noPadding, children }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{title}</span>
        {action && <span data-testid="panel-action">{action}</span>}
      </div>
      <div className={noPadding ? styles.panelBodyNoPadding : styles.panelBody}>
        {children}
      </div>
    </div>
  );
}

Panel.defaultProps = {
  action: null,
  noPadding: false,
};

Panel.propTypes = {
  title: PropTypes.string.isRequired,
  action: PropTypes.node,
  noPadding: PropTypes.bool,
  children: PropTypes.node.isRequired,
};
