import Geolocation from './Geolocation';
import Header from './Header';
import styles from './index.module.scss';
import Input from './Input';
import Loop from './Loop';
import Select from './Select';

const PaperInputPicker = (props) => {
  const {
    provided, innerRef,
    item,
    formItems, setFormItems,
    removeValue,
    onSelectBlock,
  } = props;

  return (
    <div
      {...provided.draggableProps}
      ref={innerRef}
      className={styles.block}
      onClick={() => onSelectBlock && onSelectBlock(item)}
    >
      <button
        type="button"
        data-testid="drag-handle"
        className={styles.dragHandle}
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        {...provided.dragHandleProps}
      >⠿</button>
      <Input
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
      />
      <Select
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
      />
      <Header
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
      />
      <Geolocation
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
      />
      <Loop
        item={item}
        formItems={formItems}
        setFormItems={setFormItems}
        removeValue={removeValue}
      />
    </div>
  );
};

export default PaperInputPicker;
