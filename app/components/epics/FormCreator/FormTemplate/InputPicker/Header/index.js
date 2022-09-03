import { useEffect, useState } from 'react';

import { Button } from '../../../../../elements';
import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Header = (props) => {
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
          <Button text="REMOVE HEADER" intent="danger" className={styles.remove} onClick={() => removeValue(item.id)} />
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
