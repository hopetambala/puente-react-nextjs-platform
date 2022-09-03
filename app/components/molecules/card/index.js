import styles from './index.module.scss';
/**
 * Card Component that has
 *  title
 *  description
 *  Link (if it's clicked)
 *  Actions
 *
 * @example
 * Card(
 *  "Healthy Behaviors",
 *  "A form about health behavior",
 *  "www.healthy.com",
 *  [{text: "Click Me!", action: clickAction },{text:"Navigate", action: navigateAction}]
 * )
 *
 * @param {String} title First number
 * @param {String} description Max limit of results
 * @param {String} nextLink Name of Backend Model
 * @param {Array} actions Name of Column in Backend Model
 * @returns Card Component
 */

const Card = ({
  title, description, nextLink, actions,
}) => (
  <a href={nextLink || null} className={styles.card}>
    <h3>{title}</h3>
    <p>{description}</p>
    {actions
    && (
    <div>
      {actions.map((action) => <button type="button" onClick={action.action}>{action.text}</button>)}
    </div>
    )}
  </a>

);

export default Card;
