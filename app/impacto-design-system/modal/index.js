import MaterialModal from '@material-ui/core/Modal';
import { makeStyles } from '@material-ui/core/styles';
import { useState } from 'react';

// Imported from the concrete modules, not the barrel: Modal is itself exported
// from app/impacto-design-system, so importing the barrel here made the package
// index depend on itself.
import Button from '../button';
import Card from '../card';
import Stack from '../stack';
import Text from '../text';

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

const useStyles = makeStyles(() => ({
  paper: {
    position: 'absolute',
    width: 400,
  },
}));

const Modal = ({
  open, handleClose, text, action, actionText, intent,
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
        <Card>
          <Stack isVertical spacing="medium">
            <Text element="h4" text={text} />
            <Button intent={intent} isFullWidth onClick={action} text={actionText} />
          </Stack>
        </Card>
      </div>
    </MaterialModal>
  );
};

export default Modal;
