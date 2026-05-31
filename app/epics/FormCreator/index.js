import {
    Button,
    EmptyState, PageHeader, Panel, Toast
} from 'app/impacto-design-system';
import { postObjectsToClass, updateObject } from 'app/modules/cloud-code';
import { useCallback, useEffect, useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { v4 as uuid } from 'uuid';

import NativeApplicationDrawer from '../NativeApplcationDrawer';
import { copy, reorder } from './_utils';
import FormBlocks from './FormBlocks';
import FormTemplate from './FormTemplate';
import styles from './index.module.scss';
import Inspector from './Inspector';

const COLLECTION = [
  {
    id: uuid(),
    text: 'Question - Number response',
    fieldType: 'numberInput',
    infoText: 'Number Input: For questions requiring a numerical answer',
  },
  {
    id: uuid(),
    text: 'Question - Text response',
    fieldType: 'input',
    infoText: 'Text Input: For questions requiring text as an answer',
  },
  {
    id: uuid(),
    text: 'Question (Side label) - Text or Number Response',
    fieldType: 'inputSideLabel',
    infoText:
      'Similar to number or text response but with additional label for adding units of measurement next to the input field',
  },
  {
    id: uuid(),
    text: 'Question - Single select',
    fieldType: 'select',
    infoText:
      'Single Choice Select: For questions requiring one unique answer from a set of provided options',
  },
  {
    id: uuid(),
    text: 'Question - Multi-select',
    fieldType: 'selectMulti',
    infoText:
      'Multiple Choice Select: For questions allowing several possible answers from a set of provided options',
  },
  {
    id: uuid(),
    text: 'Input - Header',
    fieldType: 'header',
    infoText: 'Header: A header row/title to your form',
  },

  {
    id: uuid(),
    text: 'Geolocation',
    fieldType: 'geolocation',
    infoText: 'Geolocation: Collect longitude/latitude from a user',
  },
  /** { id: uuid(), text: 'Repeat Group - Multi Form Submission', fieldType: 'loop',
   *  infoText: 'Multi Form Submission:
   * 'An option that allows you to submit multiple records to multiple forms ' },
   * */
  // {
  //   id: uuid(),
  //   text: "Repeat Group - Single Form Submission",
  //   fieldType: "loopSameForm",
  //   infoText:
  //     "Single Form Submission: An option that allows you to submit multiple records in the same form",
  // },
];

function FormCreator({ context, user }) {
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formItems, setFormItems] = useState([]);
  const [formTypeNames, setFormTypeNames] = useState(['Custom']);
  const [formId, setFormId] = useState();

  // const [workflowTypes] = useState(["Puente", "Assets", "Marketplace"]);
  // const [workflowNames, setWorkflowNames] = useState([]);
  // const [newWorkflowValue, setNewWorkflowValue] = useState("");

  const [selectedBlock, setSelectedBlock] = useState(null);

  const [previewOpen, setPreviewOpen] = useState();
  const [submissionType, setSubmissionType] = useState('');
  const [submission, setSubmission] = useState(false);

  useEffect(() => {
    if (context.store['/forms/form-creator']) {
      const { data, action } = context.store['/forms/form-creator'];

      setSubmissionType(action);

      const {
        typeOfForm,
        fields,
        organizations: orgs,
        objectId,
        name,
        description,
      } = data;

      setFormId(objectId);
      setFormName(name);
      setFormDescription(description);
      setFormTypeNames(typeOfForm || []);
      console.log("Orgs Authorized", orgs); //eslint-disable-line
      setFormItems(fields);
    }
  }, []);

  const handleFormTypesChange = (event) => {
    setFormTypeNames([event.target.value]);
  };

  // const handleWorkflowChange = (event) => {
  //   setWorkflowNames(event.target.value);
  // };

  // const handleTextChange = (event) => {
  //   setNewWorkflowValue(event.target.value);
  // };

  const clearForm = () => {
    setFormId('');
    setFormName('');
    setFormDescription('');
    setFormTypeNames([]);
    setFormItems([]);
  };

  const submitCustomForm = () => {
    const formObject = {};
    formObject.fields = formItems;
    formObject.organizations = [user.organization];
    formObject.typeOfForm = formTypeNames;
    const newWorkflowsToAdd = [];
    // if (newWorkflowValue !== "") {
    //   newWorkflowsToAdd = workflowNames.concat([newWorkflowValue]);
    // } else {
    //   newWorkflowsToAdd = workflowNames;
    // }
    formObject.workflows = newWorkflowsToAdd;
    formObject.name = formName;
    formObject.class = '';
    formObject.description = formDescription;
    formObject.customForm = true;

    const postParams = {
      parseClass: 'FormSpecificationsV2',
      localObject: formObject,
    };

    if (submissionType === 'edit') {
      postParams.parseClassID = formId;
      updateObject(postParams)
        .then((response) => {
          console.log(response); //eslint-disable-line
          setSubmission(true);
          setTimeout(() => setSubmission(false), 3000);
          clearForm();
        })
        .catch((err) => {
          console.log(err); //eslint-disable-line
        });
    } else if (submissionType === 'edit puente form') {
      postParams.parseClass = 'PuenteFormModifications';
      postParams.parseClassID = formId;
      postParams.localObject.class = 'PuenteFormModifications';
      const activeFields = {};
      formItems.forEach((item) => {
        activeFields[item.formikKey] = item.active;
      });
      postParams.localObject.activeFields = activeFields;
      updateObject(postParams)
        .then((response) => {
          console.log(response); //eslint-disable-line
          setSubmission(true);
          setTimeout(() => setSubmission(false), 3000);
          clearForm();
        })
        .catch((err) => {
          postObjectsToClass(postParams)
            .then(() => {
              setSubmission(true);
              setTimeout(() => setSubmission(false), 3000);
              console.log(postParams); //eslint-disable-line
            })
            .catch((error) => {
              console.log(error); //eslint-disable-line
            });
          console.log(err); //eslint-disable-line
        });
    } else {
      postObjectsToClass(postParams)
        .then(() => {
          setSubmission(true);
          setTimeout(() => setSubmission(false), 3000);
          console.log(postParams); //eslint-disable-line
          clearForm();
        })
        .catch((err) => {
          console.log(err); //eslint-disable-line
        });
    }
  };

  const removeValue = (id) => {
    const elementsIndex = formItems.findIndex((element) => element.id === id);
    const newArray = [...formItems];
    newArray.splice(elementsIndex, 1);
    setFormItems(newArray);
  };

  const updateBlock = (updatedBlock) => {
    setFormItems((prev) =>
      prev.map((item) => (item.id === updatedBlock.id ? updatedBlock : item)),
    );
    setSelectedBlock(updatedBlock);
  };

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result;

      if (!destination) {
        return;
      }

      switch (source.droppableId) {
        case destination.droppableId:
          setFormItems((state) => reorder(state, source.index, destination.index));
          break;
        case 'BLOCK':
          setFormItems((state) => copy(COLLECTION, state, source, destination));
          break;
        default:
          break;
      }
    },
    [setFormItems],
  );

  return (
    <div>
      {submission && <Toast text="Success!" />}
      <NativeApplicationDrawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        formItems={formItems}
      />
      <PageHeader
        title="Form Creator"
        actions={
          <div className={styles.headerActions}>
            <Button text="Reset form" intent="danger" onClick={clearForm} />
            <Button text="Preview form" onClick={() => setPreviewOpen(!previewOpen)} />
            <Button text="Publish" intent="primary" onClick={submitCustomForm} isLoading={submission} />
          </div>
        }
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.canvasGrid}>
          <div className={styles.canvasMain}>
            {/* Form settings card */}
            <div className={styles.settingsCard}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="formType">Type of form</label>
                <select
                  id="formType"
                  name="formType"
                  value={formTypeNames[0]}
                  onChange={handleFormTypesChange}
                  className={styles.select}
                >
                  <option value="Custom">Custom</option>
                  <option value="Assets">Assets</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="formName">Form name</label>
                <input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  type="text"
                  placeholder="Give your form a detailed name"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="formDescription">Description</label>
                <input
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  type="text"
                  placeholder="Describe how this form will be used"
                  className={styles.input}
                />
              </div>
            </div>

            {/* Form builder canvas */}
            <div className={styles.builderSection}>
              <span className={styles.builderLabel}>Form builder</span>
              <FormTemplate
                formItems={formItems}
                setFormItems={setFormItems}
                removeValue={removeValue}
                onSelectBlock={setSelectedBlock}
                selectedBlockId={selectedBlock?.id}
              />
            </div>
          </div>
          <div className={styles.blocksSidebar}>
            <Panel title="Blocks">
              <FormBlocks items={COLLECTION} />
            </Panel>
            <Panel title="Inspector">
              {selectedBlock ? (
                <Inspector
                  block={selectedBlock}
                  onChange={updateBlock}
                  onClose={() => setSelectedBlock(null)}
                />
              ) : (
                <EmptyState message="Select a block to edit." />
              )}
            </Panel>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

export default FormCreator;
// https://github.com/atlassian/react-beautiful-dnd/issues/216
