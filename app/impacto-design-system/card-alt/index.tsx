import Button from '../button';
import styles from './index.module.scss';

type CardAction = {
  text: string;
  action: () => void;
};

type CardProps = {
  title: string;
  description?: string;
  /** Where the title links to, if anywhere. */
  nextLink?: string;
  shouldOpenTab?: boolean;
  actions?: CardAction[];
  /** The title's heading level in the page's outline. */
  headingLevel?: 2 | 3 | 4;
};

/**
 * A card for a list of things (Form Marketplace): a heading, a description,
 * and its own actions.
 *
 * An <article>, not an <a>: the whole card used to be one link with buttons
 * nested inside it (invalid, and the buttons couldn't be reached reliably),
 * and with no `nextLink` it was an <a> with no href. Now only the title is a
 * link, when there is somewhere to go, and the actions are separate buttons.
 */
const CardAlt = ({
  title, description = '', nextLink, shouldOpenTab = false, actions = [], headingLevel = 3,
}: CardProps) => {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <article className={styles.card}>
      <Heading className={styles.title}>
        {nextLink ? (
          <a
            href={nextLink}
            className={styles.titleLink}
            {...(shouldOpenTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {title}
          </a>
        ) : title}
      </Heading>
      {description && <p className={styles.description}>{description}</p>}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action) => (
            <Button key={action.text} isSmall text={action.text} onClick={action.action} />
          ))}
        </div>
      )}
    </article>
  );
};

export default CardAlt;
