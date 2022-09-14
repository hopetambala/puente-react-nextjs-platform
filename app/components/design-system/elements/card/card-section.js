import React from 'react'

import CardHeader from './card-header'
import styles from './css/card.module.css'

const CardSection = ({
    children,
    title,
    subtitle,
    link,
    headerActions,
    avatar,
}) => (
    <div className={styles.cardSection}>
        <CardHeader
            title={title}
            subtitle={subtitle}
            link={link}
            headerActions={headerActions}
            avatar={avatar}
            isSmallTitle
        />
        {children}
    </div>
)

export default CardSection
