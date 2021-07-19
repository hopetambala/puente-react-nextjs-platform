import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Modal,
  TextField,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { updateObject } from 'app/services/parse';
import React from 'react';

function rand() {
  return Math.round(Math.random() * 20) - 10;
}

function getModalStyle() {
  const top = 50 + rand();
  const left = 50 + rand();

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
  };
}

const useStyles = makeStyles((theme) => ({
  paper: {
    position: 'absolute',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
}));

const Modl = ({
  open, handleClose, row, workflows,
}) => {
  const classes = useStyles();
  // getModalStyle is not a pure function, we roll the style only on the first render
  const [modalStyle] = React.useState(getModalStyle);
  const [newWorkflow, setNewWorkflow] = React.useState(false);
  const [newWorkflowValue, setNewWorkflowValue] = React.useState('');
  const [availableWorkflows, setAvailableWorkflows] = React.useState([]);
  const [newWorksflowsAssigned, setNewWorkflowsAssigned] = React.useState([]);

  // function to filter available workflows to add to form
  React.useEffect(() => {
    let availWorkflows = workflows;
    if (row.workflows !== undefined && row.workflows.length !== 0) {
      row.workflows.forEach((element) => {
        availWorkflows = availWorkflows.filter((val) => val !== element);
      });
    }
    setAvailableWorkflows(availWorkflows);
  }, []);

  //   function to handle chekcboxes for adding workflow
  const handleChange = (event) => {
    if (newWorksflowsAssigned.includes(event.target.value)) {
      setNewWorkflowsAssigned(newWorksflowsAssigned.filter((val) => val !== event.target.value));
    } else {
      setNewWorkflowsAssigned(newWorksflowsAssigned.concat([event.target.value]));
    }
  };

  const handleNewWorkflow = () => {
    setNewWorkflow(!newWorkflow);
  };

  const handleTextChange = (event) => {
    setNewWorkflowValue(event.target.value);
  };

  const submit = () => {
    let workflowsToAdd;
    if (newWorkflowValue !== '') {
      workflowsToAdd = newWorksflowsAssigned.concat([newWorkflowValue]);
    } else {
      workflowsToAdd = newWorksflowsAssigned;
    }

    if (row.workflows !== undefined && row.workflows.length !== 0) {
      workflowsToAdd = workflowsToAdd.concat(row.workflows);
    }
    const params = {
      parseClass: 'FormSpecificationsV2',
      parseClassID: row.objectId,
      localObject: {
        workflows: workflowsToAdd,
      },
    };

    updateObject(params);
    handleClose();
  };
  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="simple-modal-title"
      aria-describedby="simple-modal-description"
    >
      <div style={modalStyle} className={classes.paper}>
        <h3 id="simple-modal-description">
          Current Workflows Assigned:
        </h3>
        {row.workflows !== undefined && row.workflows.length !== 0 ? (
          <div>
            {row.workflows.map((workflow) => (
              <p>{workflow}</p>
            ))}
          </div>
        ) : (
          <p>No workflow assigned to form</p>
        )}
        <FormControl component="fieldset">
          <FormLabel component="legend">New Workflow(s) to Assign</FormLabel>
          <FormGroup>
            {availableWorkflows.map((workflow) => (
              <FormControlLabel
                value={workflow}
                control={<Checkbox onChange={(event) => handleChange(event)} />}
                label={workflow}
              />
            ))}
            <FormControlLabel value="newWorkflow" control={<Checkbox onChange={handleNewWorkflow} />} label="New Workflow" />
            {newWorkflow === true && (
            <TextField id="new-workflow" label="New Workflow" onChange={(event) => handleTextChange(event)} />
            )}
            <Button variant="contained" color="primary" style={{ marginRight: 'auto', marginTop: 10 }} onClick={submit}>Submit</Button>
          </FormGroup>
        </FormControl>
      </div>
    </Modal>
  );
};

export default Modl;
