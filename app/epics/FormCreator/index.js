import {
    Button,
    EmptyState, PageHeader, Panel, Toast
} from 'app/impacto-design-system';
import { postObjectsToClass, updateObject } from 'app/modules/cloud-code';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { v4 as uuid } from 'uuid';

import NativeApplicationDrawer from '../NativeApplcationDrawer';
import { copy, reorder } from './_utils';
import FormBlocks from './FormBlocks';
import FormTemplate from './FormTemplate';
import styles from './index.module.scss';
import Inspector from './Inspector';

// Catalog keys, not sentences. `textKey` deliberately reuses the key the
// placed block renders, so the palette entry and the block it creates cannot
// drift apart. Resolved at render — a label built here would be fixed at
// import, before the reader's locale is known.
const COLLECTION = [
  {
    id: uuid(),
    textKey: 'form_creator_type_number',
    fieldType: 'numberInput',
    infoTextKey: 'form_creator_hint_number',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_text',
    fieldType: 'input',
    infoTextKey: 'form_creator_hint_text',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_side_label',
    fieldType: 'inputSideLabel',
    infoTextKey: 'form_creator_hint_side_label',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_single_select',
    fieldType: 'select',
    infoTextKey: 'form_creator_hint_single_select',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_multi_select',
    fieldType: 'selectMulti',
    infoTextKey: 'form_creator_hint_multi_select',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_header',
    fieldType: 'header',
    infoTextKey: 'form_creator_hint_header',
  },
  {
    id: uuid(),
    textKey: 'form_creator_type_geolocation',
    fieldType: 'geolocation',
    infoTextKey: 'form_creator_hint_geolocation',
  },
];

function FormCreator({ context, user }) {
  const { t } = useTranslation('common');
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
      {submission && <Toast text={t('form_creator_success')} />}
      <NativeApplicationDrawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        formItems={formItems}
      />
      <PageHeader
        title={t('form_creator_title')}
        actions={
          <div className={styles.headerActions}>
            <Button text={t('form_creator_reset')} intent="danger" onClick={clearForm} />
            <Button text={t('form_creator_preview')} onClick={() => setPreviewOpen(!previewOpen)} />
            <Button text={t('form_creator_publish')} intent="primary" onClick={submitCustomForm} isLoading={submission} />
          </div>
        }
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.canvasGrid}>
          <div className={styles.canvasMain}>
            {/* Form settings card */}
            <div className={styles.settingsCard}>
              <label className={styles.fieldGroup} htmlFor="formType">
                <span className={styles.fieldLabel}>{t('form_creator_type_of_form')}</span>
                <select
                  id="formType"
                  name="formType"
                  value={formTypeNames[0]}
                  onChange={handleFormTypesChange}
                  className={styles.select}
                >
                  {/* The value is written to the form specification, so it
                      stays in English; only the label is read by a person. */}
                  <option value="Custom">{t('form_creator_form_type_custom')}</option>
                  <option value="Assets">{t('form_creator_form_type_assets')}</option>
                </select>
              </label>

              <label className={styles.fieldGroup} htmlFor="formName">
                <span className={styles.fieldLabel}>{t('form_creator_form_name')}</span>
                <input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  type="text"
                  placeholder={t('form_creator_form_name_placeholder')}
                  className={styles.input}
                />
              </label>

              <label className={styles.fieldGroup} htmlFor="formDescription">
                <span className={styles.fieldLabel}>{t('form_creator_description')}</span>
                <input
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  type="text"
                  placeholder={t('form_creator_description_placeholder')}
                  className={styles.input}
                />
              </label>
            </div>

            {/* Form builder canvas */}
            <div className={styles.builderSection}>
              <span className={styles.builderLabel}>{t('form_creator_builder')}</span>
              <FormTemplate
                formItems={formItems}
                setFormItems={setFormItems}
                removeValue={removeValue}
                onSelectBlock={setSelectedBlock}
                selectedBlockId={selectedBlock?.id}
                keyFrozen={Boolean(formId)}
              />
            </div>
          </div>
          <div className={styles.blocksSidebar}>
            <Panel title={t('form_creator_blocks')}>
              <FormBlocks items={COLLECTION} />
            </Panel>
            <Panel title={t('form_creator_inspector')}>
              {selectedBlock ? (
                <Inspector
                  block={selectedBlock}
                  onChange={updateBlock}
                  onClose={() => setSelectedBlock(null)}
                />
              ) : (
                <EmptyState message={t('form_creator_select_block')} />
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
