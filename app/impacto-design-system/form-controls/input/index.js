import TextField from '@material-ui/core/TextField';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import styles from './index.module.scss';

function FormInput(props) {
  const { control } = useFormContext();
  const {
    name, label, required, errorobj, errorMessage,
  } = props;
  let isError = false;
  let errMsg = errorMessage || '';
  if (!errorMessage && errorobj && Object.prototype.hasOwnProperty.call(errorobj, name)) {
    isError = true;
    errMsg = errorobj[name].message;
  }

  return (
    <Controller
      as={TextField}
      name={name}
      control={control}
      defaultValue=""
      label={label}
      fullWidth
      InputLabelProps={{
        className: required ? styles["required-label"] : "",
        required: required || false,
      }}
      error={isError}
      helperText={errMsg}
      {...props}
    />
  );
}

export default FormInput;
