import PropTypes from 'prop-types';
import React from 'react';

import Link from '../Link';
import Text from '../text';
import styles from './css/card.module.css';

const CardHeader = ({
  headerActions,
  isSmallTitle,
  link,
  subtitle,
  title,
  className,
}) => {
  if (!title && !headerActions) return null;

  let titleEl = title ? (
    <Text text={title} element={isSmallTitle ? 'h5' : 'h4'} className={link ? '' : styles.title} />
  ) : null;
  titleEl = link ? <Link to={link}>{titleEl}</Link> : titleEl;

  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.headerText}>
        {titleEl}
        {subtitle && <Text text={subtitle} element="p" className={styles.subtitle} />}
      </div>
      {headerActions}
    </div>
  );
};

CardHeader.propTypes = {
  /** A menu or button to display in the top right of the card. */
  headerActions: PropTypes.func.isRequired,

  /** Use a smaller title size. */
  isSmallTitle: PropTypes.bool,

  /** If given, link the title to the given location */
  link: PropTypes.string,

  /** Subtitle to display beneath the header. */
  subtitle: PropTypes.string,

  /** Title for the card. */
  title: PropTypes.string,
};

CardHeader.defaultProps = {
  isSmallTitle: false,
  link: null,
  subtitle: null,
  title: null,
};

export default CardHeader;
