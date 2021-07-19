import Geolocation from './Geolocation';
import Header from './Header';
import styles from './index.module.scss';
import Input from './Input';
import Select from './Select';

const PaperInputPicker = (props) => {
  const {
    provided, innerRef,
    item,
    formItems, setFormItems,
    removeValue, disabledTotal,
    setDisabledTotal,
  } = props;

  return (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={innerRef}
      className={styles.block}
    >
      <Input
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
        disabledTotal={disabledTotal}
        setDisabledTotal={setDisabledTotal}
      />
      <Select
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
        disabledTotal={disabledTotal}
        setDisabledTotal={setDisabledTotal}
      />
      <Header
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
        disabledTotal={disabledTotal}
        setDisabledTotal={setDisabledTotal}
      />
      <Geolocation
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
        disabledTotal={disabledTotal}
        setDisabledTotal={setDisabledTotal}
      />
    </div>
  );
};

export default PaperInputPicker;
