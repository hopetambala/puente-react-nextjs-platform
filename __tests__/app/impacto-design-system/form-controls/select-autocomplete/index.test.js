import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const FormSelectAutoComplete = require('app/impacto-design-system/form-controls/select-autocomplete').default;

function Harness() {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <FormSelectAutoComplete name="organization" label="Organization" options={[{ id: 'a', label: 'Puente' }]} />
    </FormProvider>
  );
}

// The organization picker's search box had no accessible name: its label was
// never linked to react-select's input, so a screen reader announced an
// unnamed combobox on the registration page (review of the sign-in fix).
it('names the search box by its label', () => {
  render(<Harness />);
  expect(screen.getByLabelText(/organization/i)).toHaveAttribute('id', 'field-organization');
});
