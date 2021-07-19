import {
  Button,
  Menu,
  MenuItem,
} from '@material-ui/core';
import FolderOpenOutlinedIcon from '@material-ui/icons/FolderOpenOutlined';
import Modal from 'app/components/UI/Modal';
import { removeQueryService } from 'app/services/parse';
import { useState } from 'react';

import styles from './index.module.scss';
import WorkflowModal from './Modal';

const Card = ({
  row, retrieveCustomData,
  passDataToFormCreator, organization, workflows,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [open, setOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState();

  const handleDuplicate = (object) => {
    passDataToFormCreator(object);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModal = (object) => {
    setOpen(!open);
    setSelectedForm(object);
  };

  const handleRemove = () => {
    removeQueryService('FormSpecificationsV2', selectedForm.objectId);
    retrieveCustomData(organization);
    setOpen(!open);
  };

  const handleWorkflowModal = () => {
    setWorkflowModalOpen(!open);
  };
  return (
    <div className={styles.card}>
      <Modal
        open={open}
        handleClose={() => setOpen(!open)}
        text="Do you want to remove this Form"
        action={handleRemove}
        actionText="Remove"
      />
      <WorkflowModal
        open={workflowModalOpen}
        handleClose={() => setWorkflowModalOpen(!workflowModalOpen)}
        row={row}
        workflows={workflows}
      />

      <FolderOpenOutlinedIcon
        fontSize="large"
      />
      <Button style={{ marginLeft: 'auto' }} onClick={handleClick}>
        Options
      </Button>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={(handleClose)}
      >
        <MenuItem onClick={() => handleDuplicate(row)}>Duplicate</MenuItem>
        <MenuItem onClick={() => handleModal(row)}>Remove</MenuItem>
        <MenuItem onClick={() => handleWorkflowModal()}>Add Workflow</MenuItem>
      </Menu>
      <hr />
      <p>{row.name}</p>
      <p>{row.description}</p>
    </div>
  );
};

export default Card;
