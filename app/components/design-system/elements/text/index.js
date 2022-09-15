import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Tooltip from '../tooltip';
import styles from './css/text.module.css';

const Color = [
  'gray',
  'white',
  'red',
  'green',
  'blue',
  'orange',
  'yellow',
  'lightGray',
];

const Text = ({
  className,
  color,
  bold,
  element,
  shouldTruncate,
  text,
  title,
  withTooltip,
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
    className
  );

  const Tag = element || 'span';
  const hoverText = title;
  const isTextString = typeof text === 'string';

  const tagElement = (
    <Tag className={classname} title={hoverText}>
      {text}
    </Tag>
  );

  // DefaultMessage is an empty string so that in the chance that an object is
  // passed without an `id`, the app does not crash, which is react-intl's default behavior:
  // https://github.com/formatjs/formatjs/issues/1108
  const formattedMessage = (
    <div defaultMessage="" {...text}>
      {(...content) => (
        <Tag className={classname} title={hoverText}>
          {content}
        </Tag>
      )}
    </div>
  );

  if (withTooltip) {
    return (
      <Tooltip position="top" shouldEllipsis trigger={text}>
        {isTextString ? tagElement : formattedMessage}
      </Tooltip>
    );
  }
  return isTextString ? tagElement : formattedMessage;
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

  /** Use the HTML title attribute to display text in a native tooltip on hover. */
  title: PropTypes.string,

  /** Determine if we should wrap the text given in a tooptip. */
  withTooltip: PropTypes.bool,
};

export default Text;
