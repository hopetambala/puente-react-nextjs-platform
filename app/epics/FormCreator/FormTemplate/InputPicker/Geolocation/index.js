import { Button } from 'app/impacto-design-system';
import { useEffect, useState } from 'react';

import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Input = (props) => {
  const {
    item,
    formItems, setFormItems,
    removeValue,
  } = props;

  const [geolocationCount, setGeolocationCount] = useState(0);
  const [activeInput, setActiveInput] = useState(item.active !== undefined ? item.active : true);

  useEffect(() => {
    const elementsIndex = formItems.findIndex((element) => element.id === item.id);
    const newArray = [...formItems];
    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      active: activeInput,
      formikKey: `geolocation_${item?.id?.slice(0, 4)}`,
    };
    setFormItems(newArray);
  }, [activeInput]);

  useEffect(() => {
    const geolocationFields = formItems.filter((element) => element.fieldType === 'geolocation');
    setGeolocationCount(geolocationFields.length);
  }, [formItems]);

  return (
    <div className={styles.element}>
      {item.fieldType === 'geolocation' && (
        <div key={item.id}>
          <h3>Geolocation</h3>
          <Button text="REMOVE QUESTION" intent="danger" className={styles.remove} onClick={() => removeValue(item.id)} />
          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
          {geolocationCount > 1 && (
            <h5>
              There should be only one geolocation field per form.
              Remove one before submission.
            </h5>
          )}
        </div>
      )}
    </div>
  );
};

export default Input;
