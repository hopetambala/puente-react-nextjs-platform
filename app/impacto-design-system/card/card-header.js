import classNames from 'classnames';
import PropTypes from 'prop-types';

import Link from '../Link';
import Text from '../text';
import styles from './css/card.module.css';

function CardHeader({
  headerActions,
  headingLevel,
  isSmallTitle,
  link,
  subtitle,
  title,
  className,
}) {
  if (!title && !headerActions) return null;

  let titleEl = title ? (
    <Text
      text={title}
      element={`h${headingLevel}`}
      className={classNames(styles.title, { [styles.smallTitle]: isSmallTitle })}
    />
  ) : null;
  // The link goes inside the heading, so it is named by the title and the
  // heading stays a heading. (It was `to=`, which Link never read: a dead link.)
  if (title && link) {
    const Heading = `h${headingLevel}`;
    titleEl = (
      <Heading className={classNames(styles.title, { [styles.smallTitle]: isSmallTitle })}>
        <Link href={link}>{title}</Link>
      </Heading>
    );
  }

  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.headerText}>
        {titleEl}
        {subtitle && <Text text={subtitle} element="p" className={styles.subtitle} />}
      </div>
      {headerActions}
    </div>
  );
}

CardHeader.propTypes = {
  /** A menu or button to display at the end of the header. */
  headerActions: PropTypes.node,

  /** The title's heading level. */
  headingLevel: PropTypes.oneOf([2, 3, 4, 5, 6]),

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
  headerActions: null,
  headingLevel: 3,
  isSmallTitle: false,
  link: null,
  subtitle: null,
  title: null,
};

export default CardHeader;
