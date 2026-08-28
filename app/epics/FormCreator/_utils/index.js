import { Card } from 'app/impacto-design-system';
import { v4 as uuid } from 'uuid';

import styles from '../index.module.scss';

/**
 * Strips characters that are illegal in a Formik field key.
 * Removes punctuation/symbols and underscores so the derived key is a plain
 * word string safe to use as an object property in Formik values.
 */
const toFormikKey = (label) => label.replace(/[`~!@#$%^&*()+=|}[{'";:?.>,<\\|\]/]+|_/g, '');

/**
 * formikKey is derived from the label once, at field-creation time, and then
 * frozen. Re-deriving it when a steward renames a question splits historical
 * FormResults (`title` = old key) from new submissions (`title` = new key),
 * which is how a monthly CSV can look like last month's answers vanished.
 *
 * On a saved form (`keyFrozen`), never re-derive — Collect already wrote
 * fields[].title from the existing key. Fall back to toFormikKey only if
 * the key is empty (rare on a saved form).
 *
 * On an unsaved form, while the current key still matches the current label,
 * keep deriving — that is the creation-time path, where the steward is still
 * typing the question. Once they diverge (a converted geolocation block, a
 * prior rename that was migrated), keep the existing key.
 */
const nextFormikKey = (existingKey, existingLabel, newLabel, keyFrozen) => {
  if (keyFrozen) {
    return existingKey || toFormikKey(newLabel);
  }
  if (existingKey && existingKey !== toFormikKey(existingLabel || '')) {
    return existingKey;
  }
  return toFormikKey(newLabel);
};

// This method is needed for rendering clones of draggables
const getRenderItem = (items) => function getRenderItemSecond(provided, snapshot, rubric) {
  const item = items[rubric.source.index];
  return (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      style={provided.draggableProps.style}
      className={snapshot.isDragging ? styles.dragging : ''}
    >
      <Card>{item.text}</Card>
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

export { copy, getRenderItem, nextFormikKey, reorder, toFormikKey };
