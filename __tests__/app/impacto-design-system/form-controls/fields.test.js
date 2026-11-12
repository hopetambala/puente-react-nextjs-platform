import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';

import { axe } from '../../../../__test-utils__/axe';

// FormInput and FormSelect as a screen-reader user meets them, inside a real
// react-hook-form (docs/responsive-a11y-overhaul.md, PR 3).

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const FormInput = require('app/impacto-design-system/form-controls/input').default;
const FormSelect = require('app/impacto-design-system/form-controls/select').default;

function Form({ children, onSubmit = () => {} }) {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

const ORGS = [{ id: 'o1', label: 'Cevicos' }, { id: 'o2', label: 'Puente' }];

describe('FormInput', () => {
  it('is named by its visible label and keeps its autocomplete and type', () => {
    render(<Form><FormInput name="email" label="Email" type="email" autoComplete="email" /></Form>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('marks required with aria-required, not the browser-validated attribute', () => {
    render(<Form><FormInput name="email" label="Email" required /></Form>);
    const input = screen.getByRole('textbox', { name: /Email/ });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('required');
  });

  it('links an error from react-hook-form and marks the field invalid (WCAG 3.3.1)', () => {
    const errors = { email: { message: 'Enter an email address.' } };
    render(<Form><FormInput name="email" label="Email" errorobj={errors} /></Form>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter an email address.');
  });

  it('is registered with the form, so its value is submitted', async () => {
    const onSubmit = jest.fn();
    render(<Form onSubmit={onSubmit}><FormInput name="email" label="Email" /></Form>);
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'ada@example.org' });
  });

  it('has no axe violations, with or without an error', async () => {
    const { container } = render(
      <Form>
        <FormInput name="email" label="Email" />
        <FormInput name="password" label="Password" type="password" errorMessage="Too short." />
      </Form>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('FormSelect', () => {
  it('is a native select named by its label, with a placeholder from the catalog', () => {
    render(<Form><FormSelect name="organization" label="Organization" options={ORGS} /></Form>);
    const select = screen.getByRole('combobox', { name: 'Organization' });
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'select_placeholder' })).toBeDisabled();
  });

  it('submits the chosen option label (the organization name)', async () => {
    const onSubmit = jest.fn();
    render(<Form onSubmit={onSubmit}><FormSelect name="organization" label="Organization" options={ORGS} /></Form>);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Organization' }), 'Puente');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit.mock.calls[0][0]).toEqual({ organization: 'Puente' });
  });

  it('links its error and marks itself invalid', () => {
    const errors = { organization: { message: 'Choose your organization.' } };
    render(<Form><FormSelect name="organization" label="Organization" options={ORGS} errorobj={errors} /></Form>);
    const select = screen.getByRole('combobox', { name: 'Organization' });
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Choose your organization.');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Form><FormSelect name="organization" label="Organization" options={ORGS} required /></Form>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
