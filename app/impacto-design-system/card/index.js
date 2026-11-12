import classNames from 'classnames';
import PropTypes from 'prop-types';

import CardHeader from './card-header';
import styles from './css/card.module.css';

function Card({
  children,
  className,
  headerActions,
  headingLevel,
  id,
  isElevated,
  isSmallTitle,
  isSubtle,
  padding,
  subtitle,
  title,
}) {
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
    },
    className,
  );

  const contents = (
    <>
      <CardHeader
        title={title}
        subtitle={subtitle}
        headerActions={headerActions}
        headingLevel={headingLevel}
        isSmallTitle={isSmallTitle}
      />
      {children}
    </>
  );

  // A card is a container, never a control. It used to become a <button>
  // (onClick) or a link (href) wrapped around its whole content, which flattened
  // the heading and anything interactive inside into one control. No caller
  // used either; put a link or button inside the card instead.
  return (
    <div className={classname} id={id || undefined}>
      {contents}
    </div>
  );
}

Card.propTypes = {
  /** Contents to put within the card. */
  children: PropTypes.element.isRequired,

  /** The title's heading level, so it fits the page's outline (default 3). */
  headingLevel: PropTypes.oneOf([2, 3, 4, 5, 6]),

  /** Provide an id, for example to be used as an anchor in URLs. */
  id: PropTypes.string,

  /** When true, applies a shadow around the card to separate it from its background. */
  isElevated: PropTypes.bool,

  /** Removes the white BG from the card, rendering on light gray app BG */
  isSubtle: PropTypes.bool,


  /** Card padding */
  padding: PropTypes.oneOf(['small', 'medium', 'large', 'extraLarge', 'none']),
};

Card.defaultProps = {
  headingLevel: 3,
  id: '',
  isElevated: false,
  isSubtle: false,
  padding: 'medium',
};

export default Card;
