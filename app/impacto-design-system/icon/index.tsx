import classNames from 'classnames';

import styles from './css/icon.module.css';
import iconComponents from './icon-components';
import { IconName } from './icon-types';


interface IconProps {
  className?: string
  /** The name of the icon. These come from icon-types.ts. */
  name: IconName;

  /** A color for the icon. Default is to inherit the parent's text color. Be cautious when setting
   * an icon color explicitly using this prop! It will be the same in both light and dark mode. If
   * you need it to change depending on the active mode, it's best to inherit the parent text color
   * using CSS variables.
   */
  color?:
    | 'lightGray'
    | 'gray'
    | 'darkGray'
    | 'black'
    | 'white'
    | 'red'
    | 'blue'
    | 'green'
    | 'teal'
    | 'purple'
    | 'yellow'
    | 'orange'

  /** Icon size. Default is medium (24px). */
  size?: 'tiny' | 'small' | 'medium' | 'large'

  /** Looking for onClick? Please use a Button with the `isIconOnly` prop instead. */
}

const Icon = ({
  name, className, color, size,
}: IconProps) => {
  const IconComponent = iconComponents[name];
  const iconStyles = classNames(
    styles.icon,
    (styles)[color || ''],
    (styles)[size || 'medium'],
    className,
  );

  return <IconComponent className={iconStyles} />;
};

export default Icon;
