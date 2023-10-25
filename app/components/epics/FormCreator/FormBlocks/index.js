/* eslint-disable react/jsx-props-no-spreading */

import { Draggable, Droppable } from 'react-beautiful-dnd';

import { getRenderItem } from '../_utils';
import styles from './index.module.scss';
import { InfoOutlined } from '@material-ui/icons';
import { Tooltip, IconButton } from '@material-ui/core';



const Copyable = (props) => {
  const { items, className, droppableId } = props;

  const handleMouseOver = () => {
    setIsHovering(true);
  };
  
  const handleMouseOut = () => {
    setIsHovering(false);
  };
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
                  <div className={styles.copy}></div>
                ) : (      
                  <Draggable draggableId={item.id} index={index} className={styles.noDragging}>
                    {(provideded, snapshoted) => (
                      <div
                        ref={provideded.innerRef}
                        {...provideded.draggableProps}
                        {...provideded.dragHandleProps}
                        className={snapshoted.isDragging ? styles.dragging : styles.noDragging}
                      >
                        <p className={styles.nodragging}>{item.text}  
                          <Tooltip 
                            title={item.infoText} 
                            placement="top" 
                            arrow >
                            <IconButton 
                              style={{backgroundColor: 'transparent'}} 
                              className={styles.infoIcon}
                            >
                              <InfoOutlined />
                            </IconButton>
                          </Tooltip>
                        </p>
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
  return <Copyable droppableId="BLOCK" items={items} />;
};

export default FormBlocks;
