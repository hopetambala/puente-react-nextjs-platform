import { Button } from 'app/components/design-system/elements'
import { useEffect, useState } from 'react'

import ActiveInput from '../Utils'
import styles from './index.module.scss'

const Input = (props) => {
    const { item, formItems, setFormItems, removeValue } = props
    const [activeInput, setActiveInput] = useState(
        item.active !== undefined ? item.active : true
    )

    useEffect(() => {
        const elementsIndex = formItems.findIndex(
            (element) => element.id === item.id
        )
        const newArray = [...formItems]
        newArray[elementsIndex] = {
            ...newArray[elementsIndex],
            active: activeInput,
        }
        setFormItems(newArray)
    }, [activeInput])

    const setValue = async (event, type) => {
        const { value, id } = event.target

        const elementsIndex = formItems.findIndex(
            (element) => element.id === id
        )
        const newArray = [...formItems]
        if (type !== 'sideLabel') {
            newArray[elementsIndex] = {
                ...newArray[elementsIndex],
                label: value,
                formikKey: value.replace(
                    /[`~!@#$%^&*()+=|}[{'";:?.>,<\\|\]/]+|_/g,
                    ''
                ),
            }
        } else {
            newArray[elementsIndex] = {
                ...newArray[elementsIndex],
                sideLabel: value.replace(/[,]+|_/g, ''),
            }
        }

        setFormItems(newArray)
    }

    return (
        <div className={styles.element}>
            {item.fieldType === 'input' && (
                <div key={item.id}>
                    <h3>Text Input Element</h3>
                    <input
                        className={styles.input}
                        type="text"
                        value={item.label || ''}
                        id={item.id}
                        onChange={setValue}
                        placeholder="Untitled Question"
                    />
                    <Button
                        text="REMOVE QUESTION"
                        intent="danger"
                        className={styles.remove}
                        onClick={() => removeValue(item.id)}
                    />
                    <ActiveInput
                        activeInput={activeInput}
                        setActiveInput={setActiveInput}
                    />
                </div>
            )}
            {item.fieldType === 'numberInput' && (
                <div key={item.id}>
                    <h3>Number Input Element</h3>
                    <input
                        className={styles.input}
                        type="text"
                        value={item.label || ''}
                        id={item.id}
                        onChange={setValue}
                        placeholder="Untitled Question"
                    />
                    <Button
                        text="REMOVE QUESTION"
                        intent="danger"
                        className={styles.remove}
                        onClick={() => removeValue(item.id)}
                    />
                    <ActiveInput
                        activeInput={activeInput}
                        setActiveInput={setActiveInput}
                    />
                </div>
            )}
            {item.fieldType === 'inputSideLabel' && (
                <div key={item.id}>
                    <h3>Input (Side Label) Element</h3>
                    <input
                        className={styles.input}
                        type="text"
                        value={item.label || ''}
                        id={item.id}
                        onChange={setValue}
                        placeholder="Untitled Question"
                    />
                    <input
                        className={styles.input}
                        type="text"
                        value={item.sideLabel || ''}
                        id={item.id}
                        onChange={(e) => setValue(e, 'sideLabel')}
                        placeholder="Side Label"
                    />
                    <Button
                        text="REMOVE QUESTION"
                        intent="danger"
                        className={styles.remove}
                        onClick={() => removeValue(item.id)}
                    />
                    <ActiveInput
                        activeInput={activeInput}
                        setActiveInput={setActiveInput}
                    />
                </div>
            )}
        </div>
    )
}

export default Input
