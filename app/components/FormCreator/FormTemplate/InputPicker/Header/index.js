import { Button } from '@material-ui/core';
import { useEffect, useState } from 'react';

import { ActiveInput } from '../Utils';
import styles from './index.module.scss';

const Header = (props) => {
  const {
    item,
    formItems, setFormItems,
    removeValue, disabledTotal,
    setDisabledTotal,
  } = props;
  const [activeInput, setActiveInput] = useState(true);

  useEffect(() => {
    const elementsIndex = formItems.findIndex((element) => element.id === item.id);
    const newArray = [...formItems];
    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      // formikKey: `geolocation_${item.id.slice(0, 4)}`,
      active: activeInput,
    };
    setFormItems(newArray);
  }, [activeInput]);

  const setValue = async (event) => {
    const { value, id } = event.target;

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      label: value,
      formikKey: value.replace(/[`~!@#$%^&*()+=|}[{'";:?.>,<\\|\]/]+|_/g, ''),
      active: activeInput,
    };

    setFormItems(newArray);
  };

  return (
    <div className={styles.element}>
      {item.fieldType === 'header' && (
        <div key={item.id}>
          <h3>Header</h3>
          <input className={styles.input} type="text" value={item.label || ''} id={item.id} onChange={setValue} placeholder="Untitled Header" />
          <Button variant="contained" className={styles.remove} onClick={() => removeValue(item.id)}>Remove Header</Button>
          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
            disabledTotal={disabledTotal}
            setDisabledTotal={setDisabledTotal}
          />
        </div>
      )}
    </div>
  );
};

export default Header;
