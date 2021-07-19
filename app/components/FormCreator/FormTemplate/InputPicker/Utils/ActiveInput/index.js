import {
  Checkbox,
  FormControlLabel,
} from '@material-ui/core';

const ActiveInput = ({
  activeInput, setActiveInput, disabledTotal,
  setDisabledTotal,
}) => {
  const handleChange = () => {
    // previous state active, new state disabled --> add to disabled total
    if (activeInput && disabledTotal <= 3) {
      setDisabledTotal(disabledTotal + 1);
    } else if (!activeInput && disabledTotal > 0) {
      // previous state disabled, new state active --> subtract to disabled total
      setDisabledTotal(disabledTotal - 1);
    }
    setActiveInput(!activeInput);
  };

  return (
    <div>
      {disabledTotal < 3 || (!activeInput && disabledTotal === 3) ? (
        <FormControlLabel
          control={(
            <Checkbox onChange={() => handleChange()} />
)}
          label="Disable Input"
        />
      ) : (
        <div>
          <FormControlLabel
            disabled
            control={<Checkbox onChange={() => handleChange()} />}
            label="Disable Input"
          />
          <p>You can only disable 3 inputs per form</p>
        </div>

      )}
    </div>
  );
};

export default ActiveInput;
