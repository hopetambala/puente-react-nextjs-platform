import classNames from 'classnames'
import React from 'react'

import styles from './css/stack.module.css'

const StackItem = ({ children, fill, style }) => (
    <div
        className={classNames(styles.item, { [styles.fillItemModifier]: fill })}
        style={style}
    >
        {children}
    </div>
)

export default StackItem
