import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

const MuiCheckbox = (props) => {
  const { label, name } = props;
  return (
    <FormControlLabel
      control={<Checkbox name={name} {...props} />}
      label={label}
    />
  );
};

function FormCheckBox(props) {
  const { control } = useFormContext();
  const { name, label } = props;
  return (
    <>
      <Controller
        as={MuiCheckbox}
        name={name}
        control={control}
        defaultValue={false}
        label={label}
        {...props}
      />
    </>
  );
}

export default FormCheckBox;
