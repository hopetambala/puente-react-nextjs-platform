import {
  Chip,
  Grid,
  Input,
  MenuItem,
  NoSsr,
  Select,
  Snackbar,
  TextField,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Button, Card, Stack, Text,
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

const COLLECTION = [
  {
    id: uuid(),
    text: 'Question - Numeric response',
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
    text: 'Input - Side Label',
    fieldType: 'inputSideLabel',
    infoText:
      'Side Label Input: A label for adding units of measurement next to the input field',
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

const FormCreator = ({ context, user }) => {
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formItems, setFormItems] = useState([]);
  const [formTypeNames, setFormTypeNames] = useState(['Custom']);
  const [formId, setFormId] = useState();

  // const [workflowTypes] = useState(["Puente", "Assets", "Marketplace"]);
  // const [workflowNames, setWorkflowNames] = useState([]);
  // const [newWorkflowValue, setNewWorkflowValue] = useState("");

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
    // let newWorkflowsToAdd;
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
      <NoSsr>
        <Snackbar open={submission} autoHideDuration={6000}>
          <Alert variant="filled" severity="success">
            Success!
          </Alert>
        </Snackbar>
        <NativeApplicationDrawer
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          formItems={formItems}
        />
        <div style={{ paddingBottom: 'var(--spacer-xxl)' }}>
          <Text element="h1" text="Form Creator" />
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Grid spacing={2} container>
            <Grid item xs={8}>
              <Stack isVertical spacing="medium">
                <Stack spacing="large">
                  <Button
                    text="Reset form"
                    intent="danger"
                    onClick={clearForm}
                  />
                  <Button
                    text="Preview form"
                    onClick={() => setPreviewOpen(!previewOpen)}
                  />

                  <Button
                    text="Publish"
                    intent="primary"
                    onClick={submitCustomForm}
                    isLoading={submission}
                  />
                </Stack>
                <Text text={submissionType} />
                <Stack isVertical spacing="small">
                  <Text element="h4" text="Type of custom form" />
                  <em>
                    <p>Select a form type</p>
                  </em>
                  <select
                    name="formType"
                    value={formTypeNames[0]}
                    onChange={handleFormTypesChange}
                  >
                    <option value="Custom">Custom</option>
                    <option value="Assets">Assets</option>
                  </select>
                  {/* <Text element="h2" text="Workflows" />
                <Text element="h3" text="Your Workflows" />
                <Select
                  labelId="mutiple-chip-organization"
                  id="mutiple-chip"
                  multiple
                  value={workflowNames}
                  onChange={handleWorkflowChange}
                  input={<Input id="select-multiple-chip" />}
                  renderValue={(selected) => (
                    <div>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </div>
                  )}
                >
                  {workflowTypes.map((workflowType) => (
                    <MenuItem key={workflowType} value={workflowType}>
                      {workflowType}
                    </MenuItem>
                  ))}
                </Select>
                <Text element="h3" text="Add New Workflow" />
                <TextField
                  id="new-workflow"
                  label="New Workflow"
                  onChange={(event) => handleTextChange(event)}
                /> */}
                  <Text element="h4" text="Form Name" />
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    type="text"
                    placeholder="Give your form a detailed name"
                    className={styles.input}
                  />
                  <Text element="h4" text="Form Description" />
                  <input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    type="text"
                    placeholder="Describe how this form will be used"
                    className={styles.input}
                  />
                </Stack>
                <Stack isVertical>
                  <Text element="h4" text="Form Builder" />
                  <FormTemplate
                    formItems={formItems}
                    setFormItems={setFormItems}
                    removeValue={removeValue}
                  />
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <div>
                  <Text
                    element="h2"
                    text="Building Blocks"
                    className={styles.header}
                  />
                </div>
                <FormBlocks items={COLLECTION} />
              </Card>
            </Grid>
          </Grid>
        </DragDropContext>
      </NoSsr>
    </div>
  );
};

export default FormCreator;
// https://github.com/atlassian/react-beautiful-dnd/issues/216
