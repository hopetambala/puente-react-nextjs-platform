import { Button, Stack } from 'app/impacto-design-system';
import React, { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { toFormikKey } from 'app/epics/FormCreator/_utils';
import ActiveInput from '../Utils';
import styles from './index.module.scss';

const Select = (props) => {
  const {
    item, formItems, setFormItems, removeValue,
  } = props;

  const [options, setOptions] = useState([{
    id: uuid(), label: '', value: '', text: false, textQuestion: '', textKey: '',
  }]);

  const [activeInput, setActiveInput] = useState(item.active !== undefined ? item.active : true);

  useEffect(() => {
    setFormItems((prev) => {
      const elementsIndex = prev.findIndex((element) => element.id === item.id);
      const newArray = [...prev];
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        active: activeInput,
      };
      return newArray;
    });
  }, [activeInput]);

  const populatePreFilledValues = () => {
    const { id } = item;
    const block = formItems.find((element) => element.id === id);
    if (block?.options) {
      setOptions(block.options);
    }
  };

  useEffect(() => {
    populatePreFilledValues();
  }, []);

  const setValue = async (event) => {
    const { value, id } = event.target;
    const formikKey = toFormikKey(value);

    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];

    const newOptions = [...options];
    let updatedOptions = [];

    // handle change to textKey from formikKey perspective
    newOptions.forEach((option) => {
      const newOption = option;
      const splitTextKey = option.textKey.split('__');
      if (splitTextKey.length === 3) {
        newOption.textKey = `__${formikKey}__${splitTextKey[2]}`;
      }
      updatedOptions = updatedOptions.concat(newOption);
    });

    newArray[elementsIndex] = {
      ...newArray[elementsIndex],
      label: value,
      formikKey,
      options: updatedOptions,
    };
    setFormItems(newArray);
  };

  const addOption = () => {
    setOptions([...options, {
      id: uuid(),
      label: '',
      value: '',
      text: false,
      textQuestion: '',
      textKey: '',
    }]);
  };

  const syncOptionsToFormItems = (updatedOptions, questionId) => {
    const elementsFormIndex = formItems.findIndex((element) => element.id === questionId);
    const formArray = [...formItems];
    formArray[elementsFormIndex] = { ...formArray[elementsFormIndex], options: updatedOptions };
    setFormItems(formArray);
  };

  const editOption = async (event, questionId, valueToChange) => {
    const { value, id } = event.target;
    const textKeyValue = toFormikKey(value);

    const elementsFormIndex = formItems.findIndex((element) => element.id === questionId);
    const elementsIndex = options.findIndex((element) => element.id === id);

    // const textOption = options[elementsIndex].text
    const newArray = [...options];
    const formArray = [...formItems];
    // handle textKey change from option value perspective
    if (valueToChange === 'optionValue') {
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        label: value,
        value,
        textKey: `__${formArray[elementsFormIndex].formikKey}__${textKeyValue}`,
      };
    } else if (valueToChange === 'textQuestion') {
      newArray[elementsIndex] = {
        ...newArray[elementsIndex],
        textQuestion: value,
      };
    }

    setOptions(newArray);
    syncOptionsToFormItems(newArray, questionId);
  };

  const removeOption = (id) => {
    const elementsIndex = options.findIndex((element) => element.id === id);
    const newArray = [...options];
    newArray.splice(elementsIndex, 1);
    setOptions(newArray);
    syncOptionsToFormItems(newArray, item.id);
  };

  const editTextOption = (optionId, val) => {
    const elementsIndex = options.findIndex((element) => element.id === optionId);
    const newArray = [...options];
    newArray[elementsIndex].text = val;
    setOptions(newArray);
  };

  return (
    <div className={styles.element}>
      {item?.fieldType === 'select' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <h4>Question - Single select</h4>
            <Button
              text="Remove question"
              intent="danger"
              className={styles.remove}
              onClick={() => removeValue(item.id)}
              isIconOnly
              icon="delete"
            />
          </div>
          <input
            className={styles.input}
            type="text"
            value={item.label || ''}
            id={item.id}
            onChange={setValue}
            placeholder="Enter your question here"
          />
          <div>
            {options.map((option, index) => (
              <div key={option.id}>
                <h5>{`Option ${index + 1}`}</h5>
                <Stack spacing="small">
                  <input
                    type="text"
                    value={option.value}
                    id={option.id}
                    onChange={(e) => editOption(e, item.id, 'optionValue')}
                  />
                  <Button isSmall onClick={addOption} text="Add option" />
                  <Button
                    isSmall
                    onClick={() => removeOption(option.id)}
                    text="Remove"
                  />
                  {option.text === false && (
                    <Button
                      isSmall
                      onClick={() => editTextOption(option.id, true)}
                      text="Add Text Question When Selected"
                    />
                  )}
                  {option.text === true && (
                    <div>
                      <h4>
                        {`Question to ask when Option ${index + 1} selected`}
                      </h4>
                      <input
                        type="text"
                        value={option.textQuestion}
                        id={option.id}
                        onChange={(e) => editOption(e, item.id, 'textQuestion')}
                      />
                      <Button
                        isSmall
                        onClick={() => editTextOption(option.id, false)}
                        text="Remove Text Question When Selected"
                      />
                    </div>
                  )}
                </Stack>
              </div>
            ))}
          </div>

          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
      {item?.fieldType === 'selectMulti' && (
        <div key={item.id}>
          <div className="ids-flex-space-between">
            <h4>Question - Multi-select</h4>
            <Button
              text="Remove question"
              intent="danger"
              className={styles.remove}
              onClick={() => removeValue(item.id)}
              isIconOnly
              icon="delete"
            />
          </div>
          <input
            className={styles.input}
            type="text"
            value={item.label || ''}
            id={item.id}
            onChange={setValue}
            placeholder="Enter your question here"
          />
          <div>
            {options.map((option, index) => (
              <div key={option.id}>
                <h5>{`Option ${index + 1}`}</h5>
                <Stack spacing="small">
                  <input
                    type="text"
                    value={option.value}
                    id={option.id}
                    onChange={(e) => editOption(e, item.id, 'optionValue')}
                  />
                  <Button isSmall onClick={addOption} text="Add option" />

                  <Button
                    isSmall
                    onClick={() => removeOption(option.id)}
                    text="Remove"
                  />
                  {option.text === false && (
                    <Button
                      onClick={() => editTextOption(option.id, true)}
                      text="Add Text Question When Selected"
                    />
                  )}
                  {option.text === true && (
                    <div>
                      <h5>
                        {`Question to ask when Option ${index + 1} selected`}
                      </h5>
                      <input
                        type="text"
                        value={option.textQuestion}
                        id={option.id}
                        onChange={(e) => editOption(e, item.id, 'textQuestion')}
                      />
                      <Button
                        intent="danger"
                        onClick={() => editTextOption(option.id, false)}
                        text="Remove Text Question When Selected"
                      />
                    </div>
                  )}
                </Stack>
              </div>
            ))}
          </div>

          <ActiveInput
            activeInput={activeInput}
            setActiveInput={setActiveInput}
          />
        </div>
      )}
    </div>
  );
};

export default Select;
