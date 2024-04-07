import classNames from 'classnames';
import { FunctionComponent } from 'react';
import Icon from '../icon';
import { IconName } from '../icon/icon-types';
import styles from './css/tag.module.css';

export type Color =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'outline'
  | 'clear';

export interface TagProps {
  /** Apply custom styles. */
  className?: string

  /** Tag background color. If undefined, defaults to gray. */
  color?: Color

  /** Display an icon to the left of the tag text.
   * You can either set avatarSrc or icon, not both.
   */
  icon?: IconName

  /** A unique ID to pass to the tag */
  id?: string

  /** When true, consumes available width. */
  isFullWidth?: boolean

  /** When true, fully rounds the corners of the tag. */
  isRound?: boolean

  hasBorder?: boolean

  /** Is the tag disabled? If true, prevents mouse interaction. */
  isDisabled?: boolean

  /** Is hover effects for the tag disabled? */
  isHoverEffectsDisabled?: boolean

  /** Click handler. */
  onClick?: (e: React.SyntheticEvent<HTMLButtonElement>) => void

  /** Hover handler. */
  onMouseEnter?: (e: React.SyntheticEvent<HTMLSpanElement>) => void

  /** Dismiss handler. When set, displays an x icon to the right of the tag. */
  onRemove?: (e: React.SyntheticEvent<HTMLButtonElement>) => void

  /** Text to render in the tag. Only use a plaintext string for user-generated content. */
  text?: string

  /** Contents of the tag component. */
  children?: React.ReactNode
}

export const Tag: FunctionComponent<TagProps> = ({
  color,
  // icon,
  id,
  isFullWidth,
  isRound,
  isDisabled,
  onClick,
  onMouseEnter,
  onRemove,
  text,
  className,
  hasBorder,
  children,
  isHoverEffectsDisabled,
}: TagProps) => {
  const wrapperClassName = classNames(
    styles.tagWrapper,
    (styles as any)[`color-${color}`],
    {
      [styles.fullWidth]: !!isFullWidth,
      [styles.border]: hasBorder,
    },
    className
  )

  const tagClassName = classNames(styles.tag, {
    [styles.clickable]: onClick,
    [styles.clickableEffects]: !isHoverEffectsDisabled,
    [styles.round]: isRound,
    [styles.dismissible]: onRemove,
    [styles.disabled]: isDisabled,
  })

  const removeClassName = classNames(styles.dismissButton, {
    [styles.dismissButtonEffect]: !isHoverEffectsDisabled,
  })

  // const renderIcon = () =>  (
  //       <span className={styles.tagIcon}>
  //         <Icon name={icon} size="tiny" />
  //       </span>
  //     )

  const renderText = () => text && <p className={styles.tagText}>{text}</p>

  const DismissButton = () =>
    onRemove ? (
      <button id={id} onClick={onRemove} className={removeClassName}>
        <Icon name="close" size="tiny" />
      </button>
    ) : null

  const tag = onClick ? (
    <button id={id} className={tagClassName} onClick={onClick}>
      {/* {renderIcon()} */}
      {renderText()}
      {children}
    </button>
  ) : (
    <span
      id={id}
      className={tagClassName}
      onMouseEnter={isHoverEffectsDisabled ? undefined : onMouseEnter}
    >
      {/* {renderIcon()} */}
      {renderText()}
      {children}
    </span>
  )

  const tagWrapper = (
    <span className={wrapperClassName}>
      {tag}
      <DismissButton />
    </span>
  )

  return tagWrapper
}
