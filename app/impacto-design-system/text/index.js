import classNames from 'classnames';
import PropTypes from 'prop-types';

import styles from './css/text.module.css';

const Color = ['gray', 'white', 'red', 'green', 'blue', 'orange', 'yellow', 'lightGray'];

const Text = ({
  className,
  color,
  bold,
  element,
  shouldTruncate,
  text,
  title,
}) => {
  if (!text) return null;

  const classname = classNames(
    styles.text,
    {
      [styles.lightGray]: color && color === 'lightGray',
      [styles.gray]: color && color === 'gray',
      [styles.white]: color && color === 'white',
      [styles.red]: color && color === 'red',
      [styles.green]: color && color === 'green',
      [styles.blue]: color && color === 'blue',
      [styles.orange]: color && color === 'orange',
      [styles.yellow]: color && color === 'yellow',
      [styles.bold]: bold,
      [styles.truncate]: shouldTruncate,
    },
    className,
  );

  const Tag = element || 'span';
  // Plain text only. The non-string branch (react-intl's leftover) passed a
  // function as a child and rendered nothing useful; withTooltip had no
  // callers. Both are gone. `title` is kept for callers that set it, but it is
  // not an accessible name or a tooltip for keyboard users: put anything a
  // reader needs in the text itself.
  return <Tag className={classname} title={title || undefined}>{text}</Tag>;
};

Text.propTypes = {
  /** Text color will be inherited by default, but you can set it explicitly. */
  color: PropTypes.oneOf(Color),

  /** Choose an element to wrap the text. Default is span. */
  element: PropTypes.oneOf(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong']),

  /** Restricts the text to a single line and add ellipses when space is unavailable. */
  shouldTruncate: PropTypes.bool,

  /** The message to render. Only use a plaintext string when the content is user-generated or
   * comes directly from the server without our control. All other messages should have a
   * translation key defined and values interpolated.
   */
  text: PropTypes.string,

  /** The HTML title attribute. Mouse-only: never the only place information lives. */
  title: PropTypes.string,
};

export default Text;
