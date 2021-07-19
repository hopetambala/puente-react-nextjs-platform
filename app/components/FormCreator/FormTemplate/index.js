import { Draggable, Droppable } from 'react-beautiful-dnd';

import styles from './index.module.scss';
import InputPicker from './InputPicker';

const FormTemplate = (props) => {
  const {
    formItems, setFormItems, removeValue,
    disabledTotal, setDisabledTotal,
  } = props;
  return (
    <Droppable droppableId="DROP-AREA" className={styles.formTemplate}>
      {(providedDrop) => (
        <div ref={providedDrop.innerRef} className={styles['drop-area']}>
          {formItems.map((item, index) => (
            <Draggable key={item.id} draggableId={item.id} index={index}>
              {(providedDrag) => (
                <InputPicker
                  item={item}
                  formItems={formItems}
                  setFormItems={setFormItems}
                  removeValue={removeValue}
                  provided={providedDrag}
                  innerRef={providedDrag.innerRef}
                  disabledTotal={disabledTotal}
                  setDisabledTotal={setDisabledTotal}
                />
              )}
            </Draggable>
          ))}
          {providedDrop.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default FormTemplate;
