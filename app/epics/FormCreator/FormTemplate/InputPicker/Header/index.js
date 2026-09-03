import { nextFormikKey } from 'app/epics/FormCreator/_utils';
import { Button } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Header = (props) => {
  const { t } = useTranslation('common');
  const {
    item,
    formItems, setFormItems,
    removeValue,
    keyFrozen,
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

  const setValue = async (event) => {
    const { value, id } = event.target;

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    const current = newArray[elementsIndex];
    newArray[elementsIndex] = {
      ...current,
      label: value,
      formikKey: nextFormikKey(current.formikKey, current.label, value, keyFrozen),
      active: activeInput,
    };

    setFormItems(newArray);
  };

  return (
    <div className={styles.element}>
      {item.fieldType === 'header' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <h4>{t('form_creator_type_header')}</h4>
            <Button
              text={t('form_creator_remove_header')}
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
            placeholder={t('form_creator_untitled_header')}
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

export default Header;
