import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Link from '../Link';
import CardHeader from './card-header';
import styles from './css/card.module.css';

const Card = ({
  children,
  className,
  headerActions,
  href,
  id,
  isElevated,
  isSmallTitle,
  isSubtle,
  onClick,
  padding,
  subtitle,
  title,
}) => {
  const classname = classNames(
    styles.card,
    {
      [styles.smallPadding]: padding === 'small',
      [styles.mediumPadding]: padding === 'medium',
      [styles.largePadding]: padding === 'large' || padding === undefined,
      [styles.extraLargePadding]: padding === 'extraLarge',
      [styles.noPadding]: padding === 'none',
      [styles.elevated]: isElevated,
      [styles.subtle]: isSubtle,
      [styles.clickable]: onClick || href,
    },
    className,
  );

  const contents = (
    <>
      <CardHeader
        title={title}
        subtitle={subtitle}
        headerActions={headerActions}
        isSmallTitle={isSmallTitle}
      />
      {children}
    </>
  );

  const sharedCardProps = {
    className: classname,
    id,
  };

  if (onClick) {
    return (
      <button {...sharedCardProps} onClick={onClick} type="button">
        {contents}
      </button>
    );
  } if (href) {
    return (
      <Link
        to={href}
        {...{ ...sharedCardProps }}
        onClick={onClick}
      >
        {contents}
      </Link>
    );
  }

  return (
    <div {...sharedCardProps}>
      {contents}
    </div>
  );
};

Card.propTypes = {
  /** Contents to put within the card. */
  children: PropTypes.element.isRequired,

  /** Link somewhere. */
  href: PropTypes.string,

  /** Provide an id, for example to be used as an anchor in URLs. */
  id: PropTypes.string,

  /** When true, applies a shadow around the card to separate it from its background. */
  isElevated: PropTypes.bool,

  /** Removes the white BG from the card, rendering on light gray app BG */
  isSubtle: PropTypes.bool,

  /** Optionally make the card clickable */
  onClick: PropTypes.func,

  /** Card padding */
  padding: PropTypes.oneOf(['small', 'medium', 'large', 'extraLarge', 'none']),
};

Card.defaultProps = {
  href: null,
  id: '',
  isElevated: false,
  isSubtle: false,
  onClick: null,
  padding: 'medium',
};

export default Card;
