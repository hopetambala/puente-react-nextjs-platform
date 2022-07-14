import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './css/icon.module.css';
import iconComponents from './icon-components';
import IconNames from './icon-types';

const Icon = ({
  name, className, color, size,
}) => {
  const IconComponent = iconComponents[name];
  const iconStyles = classNames(
    styles.icon,
    (styles)[color || ''],
    (styles)[size || 'medium'],
    className,
  );

  return <IconComponent className={iconStyles} />;
};

Icon.propTypes = {
  /** The name of the icon. These come from icon-types.ts. */
  name: PropTypes.oneOf(IconNames).isRequired,

  /** A color for the icon. Default is to inherit the parent's text color. Be cautious when setting
   * an icon color explicitly using this prop! It will be the same in both light and dark mode. If
   * you need it to change depending on the active mode, it's best to inherit the parent text color
   * using CSS variables.
   */
  color: PropTypes.oneOf(['lightGray', 'gray',
    'darkGray',
    'black',
    'white',
    'red',
    'blue',
    'green',
    'teal',
    'purple',
    'yellow',
    'orange']),

  /** Icon size. Default is medium (24px). */
  size: PropTypes.oneOf(['tiny', 'small', 'medium', 'large']),

  /** Looking for onClick? Please use a Button with the `isIconOnly` prop instead. */
};

Icon.defaultProps = {
  color: 'black',
  size: 'medium',
};

export default Icon;
