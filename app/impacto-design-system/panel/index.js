import PropTypes from 'prop-types';

import styles from './panel.module.css';

/**
 * A titled section of a page. The title is a real heading (default level 2,
 * under the page's h1), so the panel shows up in a screen reader's heading
 * list instead of being an unlabelled box with bold text.
 */
export default function Panel({
  title, action, noPadding, headingLevel, children,
}) {
  const Heading = `h${headingLevel}`;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <Heading className={styles.panelTitle}>{title}</Heading>
        {action && <span data-testid="panel-action">{action}</span>}
      </div>
      <div className={noPadding ? styles.panelBodyNoPadding : styles.panelBody}>
        {children}
      </div>
    </section>
  );
}

Panel.defaultProps = {
  action: null,
  headingLevel: 2,
  noPadding: false,
};

Panel.propTypes = {
  action: PropTypes.node,
  children: PropTypes.node.isRequired,
  /** The title's level in the page's heading outline. */
  headingLevel: PropTypes.oneOf([2, 3, 4]),
  noPadding: PropTypes.bool,
  title: PropTypes.string.isRequired,
};
