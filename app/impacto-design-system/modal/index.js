import {
  Button,
} from '@material-ui/core';
import MaterialModal  from '@material-ui/core/Modal';
import { makeStyles } from '@material-ui/core/styles';
import { useState } from 'react';

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

const Modal = ({
  open, handleClose, text, action, actionText,
}) => {
  const classes = useStyles();
  // getModalStyle is not a pure function, we roll the style only on the first render
  const [modalStyle] = useState(getModalStyle);
  return (
    <MaterialModal
      open={open}
      onClose={handleClose}
      aria-labelledby="simple-modal-title"
      aria-describedby="simple-modal-description"
    >
      <div style={modalStyle} className={classes.paper}>
        <p id="simple-modal-description">{text}</p>
        <Button variant="contained" onClick={action} text={actionText} />
      </div>
    </MaterialModal>
  );
};

export default Modal;
