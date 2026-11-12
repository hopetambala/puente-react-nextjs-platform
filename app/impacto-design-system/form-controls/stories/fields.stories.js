import { FormProvider, useForm } from 'react-hook-form';

import FormInput from '../input';
import FormSelect from '../select';

function WithForm(Story) {
  const methods = useForm();
  return <FormProvider {...methods}><form><Story /></form></FormProvider>;
}

export default {
  title: 'Components/Forms/Fields',
  decorators: [WithForm],
};

export const Input = { render: () => <FormInput name="email" label="Email" type="email" autoComplete="email" required /> };
export const InputWithError = {
  render: () => <FormInput name="password" label="Password" type="password" autoComplete="current-password" errorMessage="Enter at least 8 characters." />,
};
export const Select = {
  render: () => (
    <FormSelect
      name="organization"
      label="Organization"
      required
      options={[{ id: '1', label: 'Cevicos' }, { id: '2', label: 'Puente' }]}
    />
  ),
};
export const SelectWithError = {
  render: () => (
    <FormSelect
      name="organization"
      label="Organization"
      options={[{ id: '1', label: 'Cevicos' }]}
      errorobj={{ organization: { message: 'Choose your organization.' } }}
    />
  ),
};
