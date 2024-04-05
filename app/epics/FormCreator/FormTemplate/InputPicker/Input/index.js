import { Button, Text } from 'app/impacto-design-system';
import { useEffect, useState } from 'react';

import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Input = (props) => {
  const {
    item,
    formItems, setFormItems,
    removeValue,
  } = props;
  const [activeInput, setActiveInput] = useState(item.active !== undefined ? item.active : true);

  useEffect(() => {
    const elementsIndex = formItems.findIndex((element) => element.id === item.id);
    const newArray = [...formItems];
    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      active: activeInput,
    };
    setFormItems(newArray);
  }, [activeInput]);

  const setValue = async (event, type) => {
    const { value, id } = event.target;

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    if (type !== 'sideLabel') {
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        label: value,
        formikKey: value.replace(/[`~!@#$%^&*()+=|}[{'";:?.>,<\\|\]/]+|_/g, ''),
      };
    } else {
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        sideLabel: value.replace(/[,]+|_/g, ''),
      };
    }

    setFormItems(newArray);
  };

  return (
    <div className={styles.element}>
      {item.fieldType === 'input' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <Text text="Question - Text response" element="h4" />
            <Button
              text="Remove question"
              intent="danger"
              className={styles.remove}
              onClick={() => removeValue(item.id)}
              isIconOnly
              icon="delete"
            />
          </div>
          <input
            className={styles.input}
            type="text"
            value={item.label || ''}
            id={item.id}
            onChange={setValue}
            placeholder="Enter your question here"
          />

          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
      {item.fieldType === 'numberInput' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <Text text="Question - Number response" element="h4" />
            <Button
              text="Remove question"
              intent="danger"
              className={styles.remove}
              onClick={() => removeValue(item.id)}
              isIconOnly
              icon="delete"
            />
          </div>
          <input
            className={styles.input}
            type="text"
            value={item.label || ''}
            id={item.id}
            onChange={setValue}
            placeholder="Enter your question here"
          />

          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
      {item.fieldType === 'inputSideLabel' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <Text
              text="Question (Side label) - Text or Number Response"
              element="h4"
            />

            <Button
              text="Remove question"
              intent="danger"
              className={styles.remove}
              onClick={() => removeValue(item.id)}
              isIconOnly
              icon="delete"
            />
          </div>
          <input
            className={styles.input}
            type="text"
            value={item.label || ''}
            id={item.id}
            onChange={setValue}
            placeholder="Enter your question here"
          />
          <input
            className={styles.input}
            type="text"
            value={item.sideLabel || ''}
            id={item.id}
            onChange={(e) => setValue(e, 'sideLabel')}
            placeholder="Side Label"
          />

          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
    </div>
  );
};

export default Input;
