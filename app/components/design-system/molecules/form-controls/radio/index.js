import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

const MuiRadio = (props) => {
  const { label, name, options } = props;
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">{label}</FormLabel>
      <RadioGroup row name={name} {...props}>
        {options.map((item) => (
          <FormControlLabel
            key={item.value}
            value={item.value}
            control={<Radio />}
            label={item.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

function FormRadio(props) {
  const { control } = useFormContext();
  const { name, label } = props;
  return (
    <>
      <Controller
        as={MuiRadio}
        name={name}
        control={control}
        defaultValue=""
        label={label}
        {...props}
      />
    </>
  );
}

export default FormRadio;
