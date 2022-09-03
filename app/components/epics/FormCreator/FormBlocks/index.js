/* eslint-disable react/jsx-props-no-spreading */

import { Draggable, Droppable } from 'react-beautiful-dnd';

import { getRenderItem } from '../_utils';
import styles from './index.module.scss';

const Copyable = (props) => {
  const { items, className, droppableId } = props;
  return (
    <Droppable
      renderClone={getRenderItem(items, className)}
      droppableId={droppableId}
      isDropDisabled
    >
      {(provided, snapshot) => (
        <div ref={provided.innerRef} className={className}>
          {items.map((item, index) => {
            const shouldRenderClone = item.id === snapshot.draggingFromThisWith;
            return (
              <div key={item.id}>
                {shouldRenderClone ? (
                  <div className={styles.copy}>{item.text}</div>
                ) : (
                  <Draggable draggableId={item.id} index={index}>
                    {(provideded, snapshoted) => (
                      <div
                        ref={provideded.innerRef}
                        {...provideded.draggableProps}
                        {...provideded.dragHandleProps}
                        className={snapshoted.isDragging ? styles.dragging : styles.noDragging}
                      >
                        <p>{item.text}</p>
                      </div>
                    )}
                  </Draggable>
                )}
              </div>
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const FormBlocks = (props) => {
  const { items } = props;
  return <Copyable droppableId="BLOCK" className={styles['block-area']} items={items} />;
};

export default FormBlocks;
