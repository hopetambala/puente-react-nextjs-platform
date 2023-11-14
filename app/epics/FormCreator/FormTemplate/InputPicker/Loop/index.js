import { useEffect, useState } from 'react';

import { Button } from 'app/impacto-design-system';
import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Loop = (props) => {
  const {
    item,
    formItems, setFormItems,
    removeValue,
  } = props;

  const [numberQuestionsToRepeat, setNumberQuestionsToRepeat] = useState(null);
  const [repeatQuestionsExceeded, setRepeatQuestionsExcceeded] = useState(false);
  const [questionsToRepeat, setQuestionsToRepeat] = useState([]);
  const [doubleLoop, setDoubleLoop] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [activeInput, setActiveInput] = useState(item.active !== undefined ? item.active : true);

  useEffect(() => {
    const loopFields = formItems.filter((element) => element.fieldType === 'loop');
    setLoopCount(loopFields.length);
  }, [formItems]);

  const setValue = async (event) => {
    const { value, id } = event.target;

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      label: value,
      formikKey: value.replace(/[`~!@#$%^&*()+=|}[{'";:?.>,<\\|\]/]+|_/g, ''),
    };

    setFormItems(newArray);
  };

  const setQuestionsToRepeatValue = async (event) => {
    setRepeatQuestionsExcceeded(false);
    setDoubleLoop(false);
    const { value, id } = event.target;

    setNumberQuestionsToRepeat(Number(value));

    const copiedFormItems = JSON.parse(JSON.stringify(formItems));
    copiedFormItems.forEach((formItem, index) => {
      if (formItem.id === id) {
        let repeatItems = [];
        for (let i = index - value; i < index; i += 1) {
          if (i >= 0) {
            // geolocation is only feildtype that does not have a label
            if (copiedFormItems[i].fieldType !== 'geolocation') {
              if (copiedFormItems[i].fieldType === 'loop') {
                setDoubleLoop(true);
              }
              repeatItems = repeatItems.concat(copiedFormItems[i].label);
            } else if (copiedFormItems[i].fieldType !== 'geolocation') {
              repeatItems = repeatItems.concat('geolocation');
            } else {
              // loop
              setDoubleLoop(true);
            }
          } else {
            setRepeatQuestionsExcceeded(true);
          }
        }
        setQuestionsToRepeat(repeatItems);
      }
    });

    if (!Number.isNaN(Number(value))) {
      const elementsIndex = formItems.findIndex((element) => element.id === id);
      const newArray = [...formItems];
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        numberQuestionsToRepeat: value,
      };

      setFormItems(newArray);
    }
  };

  return (
    <div className={styles.element}>
      {(item.fieldType === 'loop' || item.fieldType === 'loopSameForm') && (
        <div key={item.id}>
          <h3>Repeat Group Element</h3>
          <input className={styles.input} type="text" value={item.label || ''} id={item.id} onChange={setValue} placeholder="Untitled Loop" />
          <h4>Number of Previous Questions to Repeat in Group</h4>
          <input className={styles.input} type="text" value={item.numberQuestionsToRepeat || ''} id={item.id} onChange={setQuestionsToRepeatValue} placeholder="eg. 3" />
          <Button text="REMOVE QUESTION" intent="danger" className={styles.remove} onClick={() => removeValue(item.id)} />

          {doubleLoop === true && (
            <h5 className={styles.error}>
              ERROR! Your repeat group contains another repeat group, your form will break!
            </h5>
          )}
          {Number.isNaN(numberQuestionsToRepeat) && (
            <h5 className={styles.error}>
              ERROR! Number of Previous Questions to Repeat must be a Number!
            </h5>
          )}
          {repeatQuestionsExceeded === true && (
            <h5 className={styles.error}>
              ERROR! You have repeated more questions than exist prior to
              the loop! Change value now!
            </h5>
          )}
          {loopCount > 1 && (
            <h5 className={styles.error}>
              ERROR! There should be only one geolocation field per form.
              Remove one before submission.
            </h5>
          )}
          {questionsToRepeat.length > 0 && (
          <div>
            <h4>
              Questions in Repeat Group (Values only reflect questions created
              prior to entering value. Re-enter number to see updated group)
            </h4>
            {questionsToRepeat.map((question) => (
              <h5>{question}</h5>
            ))}
          </div>
          )}
          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
    </div>
  );
};

export default Loop;
