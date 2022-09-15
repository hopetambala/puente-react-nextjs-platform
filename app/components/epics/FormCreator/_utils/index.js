import { v4 as uuid } from 'uuid';

import styles from '../index.module.scss';

// This method is needed for rendering clones of draggables
const getRenderItem = (items) => (provided, snapshot, rubric) => {
  const item = items[rubric.source.index];
  return (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      style={provided.draggableProps.style}
      className={snapshot.isDragging ? styles.dragging : ''}
    >
      {item.text}
    </div>
  );
};

const reorder = (list, startIndex, endIndex) => {
  // console.log(list);
  const [removed] = list.splice(startIndex, 1);
  list.splice(endIndex, 0, removed);
  return list;
};

const copy = (source, destination, droppableSource, droppableDestination) => {
  const item = source[droppableSource.index];
  destination.splice(droppableDestination.index, 0, { ...item, id: uuid() });
  return destination;
};

export { copy, getRenderItem, reorder };
