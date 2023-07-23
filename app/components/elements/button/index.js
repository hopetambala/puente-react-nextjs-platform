import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Icon from '../icon';
import Link from '../Link';
import Spinner from '../spinner';
import Text from '../text';
import Tooltip from '../tooltip';
import styles from './css/button.module.css';

const Button = ({
  href,
  icon,
  id,
  intent,
  isDisabled,
  isDropdown,
  isFullWidth,
  isIconOnly,
  isLoading,
  isSmall,
  onClick,
  text,
  shouldOpenHrefInNewTab,
}) => {
  const classname = classNames({
    [styles.button]: !isIconOnly,
    [styles.iconButton]: isIconOnly,
    [styles.primary]: intent === 'primary',
    [styles.danger]: intent === 'danger',
    [styles.disabled]: isDisabled || isLoading,
    [styles.small]: isSmall,
    [styles.fullWidth]: isFullWidth,
    [styles.dropdown]: isDropdown,
    [styles.loading]: isLoading,
  });

  const contents = (
    <>
      {icon && <Icon name={icon} className={styles.buttonIcon} />}
      {text && <Text className={styles.buttonText} text={text} />}
      {isDropdown && !isIconOnly && (
        <Icon
          name="arrowDropDown"
          className={styles.dropdownIcon}
          size="tiny"
        />
      )}
      {isLoading && (
        <div className={styles.spinner}>
          <Spinner isSmall />
        </div>
      )}
    </>
  );

  const button = href ? (
    <Link
      href={href}
      className={classname}
      id={id}
      shouldOpenHrefInNewTab={shouldOpenHrefInNewTab}
    >
      {contents}
    </Link>
  ) : (
    <button
      id={id}
      onClick={onClick}
      className={classname}
      disabled={!!isDisabled || !!isLoading}
      type="button"
    >
      {contents}
    </button>
  );

  const shouldShowTooltip = isIconOnly && !isLoading && !isDisabled;

  return text && shouldShowTooltip ? (
    <Tooltip trigger={button} position="bottom">
      <Text text={text} />
    </Tooltip>
  ) : (
    button
  );
};

Button.defaultProps = {
  href: null,
  shouldOpenHrefInNewTab: false,
  icon: null,
  id: null,
  intent: null,
  isDisabled: false,
  isDropdown: false,
  isFullWidth: false,
  isIconOnly: false,
  isLoading: false,
  isSmall: false,
  onClick: undefined,
  text: '',
};

Button.propTypes = {
  /** When provided, renders component using `Link` instead of `Button`. */
  href: PropTypes.string,

  /** Optional bool to open even internal urls in new tab when using href */
  shouldOpenHrefInNewTab: PropTypes.bool,

  /** Display an icon beside the text. */
  icon: PropTypes.string,

  /** Provide an ID for forms and such. */
  id: PropTypes.string,

  /** Specifcy intent: `primary` (puente) or `danger` (red). If not provided, defaults to white. */
  intent: PropTypes.oneOf(['primary', 'danger']),

  /**
   * When true, disables clicking or interacting with the button. Should generally
   * avoid, as it causes usability problems: https://axesslab.com/disabled-buttons-suck/
   */
  isDisabled: PropTypes.bool,

  /** When true, displays an arrow to the right of the text. */
  isDropdown: PropTypes.bool,

  /** When true, consumes all available width. */
  isFullWidth: PropTypes.bool,

  /** Hide the text and display an icon only. */
  isIconOnly: PropTypes.bool,

  /** Show a spinner in the button above the text or icon. When true, also disables the button. */
  isLoading: PropTypes.bool,

  /** Adjust the size of the button. */
  isSmall: PropTypes.bool,

  /** Click handler for the button. If `href` is defined, `onClick` has no effect. */
  onClick: PropTypes.func,

  /** Text to render within the button (or when isIconOnly is true, within the tooltip).
   * Prefer using a FormattedMessage object unless rendering dynamic, user-generated content.
   */
  text: PropTypes.string,
};

export default Button;
