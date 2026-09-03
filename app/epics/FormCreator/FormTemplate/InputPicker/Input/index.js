import { nextFormikKey } from 'app/epics/FormCreator/_utils';
import { Button, Text } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Input = (props) => {
  const { t } = useTranslation('common');
  const {
    item,
    formItems, setFormItems,
    removeValue,
    keyFrozen,
  } = props;
  const [activeInput, setActiveInput] = useState(item.active !== undefined ? item.active : true);

  useEffect(() => {
    setFormItems((prev) => {
      const elementsIndex = prev.findIndex((element) => element.id === item.id);
      const newArray = [...prev];
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        active: activeInput,
      };
      return newArray;
    });
  }, [activeInput]);

  const setValue = async (event, type) => {
    const { value, id } = event.target;

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    const current = newArray[elementsIndex];
    if (type !== 'sideLabel') {
      newArray[elementsIndex] = {
        ...current,
        label: value,
        formikKey: nextFormikKey(current.formikKey, current.label, value, keyFrozen),
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
            <Text text={t('form_creator_type_text')} element="h4" />
            <Button
              text={t('form_creator_remove_question')}
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
            placeholder={t('form_creator_question_placeholder')}
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
            <Text text={t('form_creator_type_number')} element="h4" />
            <Button
              text={t('form_creator_remove_question')}
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
            placeholder={t('form_creator_question_placeholder')}
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
              text={t('form_creator_type_side_label')}
              element="h4"
            />

            <Button
              text={t('form_creator_remove_question')}
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
            placeholder={t('form_creator_question_placeholder')}
          />
          <input
            className={styles.input}
            type="text"
            value={item.sideLabel || ''}
            id={item.id}
            onChange={(e) => setValue(e, 'sideLabel')}
            placeholder={t('form_creator_side_label')}
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
