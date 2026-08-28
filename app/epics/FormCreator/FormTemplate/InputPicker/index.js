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

  const selectBlock = () => onSelectBlock && onSelectBlock(item);

  return (
    // This wrapper is the drag-and-drop and card-styling layer; the heading,
    // inputs and buttons inside carry all the semantics, so it is marked
    // presentational rather than given a role that would add a tab stop in front
    // of every block. Selecting a block must not require a mouse: onFocus covers
    // tabbing into it, and onKeyDown covers the case where a click elsewhere
    // moved the selection but left the caret in this block's input.
    <div
      {...provided.draggableProps}
      ref={innerRef}
      className={styles.block}
      role="presentation"
      onClick={selectBlock}
      onFocus={selectBlock}
      onKeyDown={selectBlock}
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
