import classNames from 'classnames'
import PropTypes from 'prop-types'
import React from 'react'

import styles from './css/card-group.module.css'

const CardGroup = ({ children, spacing, direction }) => {
    const classname = classNames(styles.cardGroup, {
        [styles.column]: direction === 'column' || !direction,
        [styles.row]: direction === 'row',
        [styles.smallSpacing]: spacing === 'small',
        [styles.mediumSpacing]: spacing === 'medium' || !spacing,
        [styles.largeSpacing]: spacing === 'large',
        [styles.extraLargeSpacing]: spacing === 'extraLarge',
        [styles.noSpacing]: spacing === 'none',
    })

    return <div className={classname}>{children}</div>
}

CardGroup.propTypes = {
    /** Contents to put within the card. */
    children: PropTypes.element.isRequired,

    /** Which direction to flow the cards. */
    direction: PropTypes.oneOf(['row', 'column']),

    /** Amount of spacing between cards. */
    spacing: PropTypes.oneOf([
        'small',
        'medium',
        'large',
        'extraLarge',
        'none',
    ]),
}

CardGroup.defaultProps = {
    direction: 'column',
    spacing: 'medium',
}

export default CardGroup
