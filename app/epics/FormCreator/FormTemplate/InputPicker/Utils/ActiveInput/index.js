import {
  Checkbox,
  FormControlLabel,
} from '@material-ui/core';

const ActiveInput = ({
  activeInput, setActiveInput,
}) => {
  const handleChange = () => {
    // LEAVING THIS HERE IF IT SHOULD BE CONSTRAINED,
    //  PERSONALLY BELIEVE USERS SHOULD BE ABLE TO EDIT PUENTE FORMS FOR THEIR PURPOSES
    // previous state active, new state disabled --> add to disabled total
    // if (activeInput && disabledTotal <= 3) {
    //   setDisabledTotal(disabledTotal + 1);
    // } else if (!activeInput && disabledTotal > 0) {
    //   // previous state disabled, new state active --> subtract to disabled total
    //   setDisabledTotal(disabledTotal - 1);
    // }
    setActiveInput(!activeInput);
  };

  return (
    <div>
      <FormControlLabel
        control={(
          <Checkbox onChange={() => handleChange()} />
          )}
        label="Disable Input"
        checked={!activeInput}
      />
    </div>
  );
};

export default ActiveInput;
