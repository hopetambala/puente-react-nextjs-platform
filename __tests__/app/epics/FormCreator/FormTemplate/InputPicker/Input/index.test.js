import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Utils', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Input/index.module.scss', () => ({}));

const Input = require('app/epics/FormCreator/FormTemplate/InputPicker/Input').default;

describe('question label edit', () => {
  it('keeps formikKey on a saved form even when the key currently matches the label', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'item-saved',
      fieldType: 'input',
      label: 'Continue in the program',
      formikKey: 'Continue in the program',
    };

    render(
      <Input
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
        keyFrozen
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Enter your question here'), {
      target: { value: 'Keep going?', id: 'item-saved' },
    });

    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('Continue in the program');
    expect(updated.label).toBe('Keep going?');
  });

  it('updates formikKey on an unsaved form while the key is still in sync', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'item-new',
      fieldType: 'input',
      label: 'Continue in the program',
      formikKey: 'Continue in the program',
    };

    render(
      <Input
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
        keyFrozen={false}
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Enter your question here'), {
      target: { value: 'Keep going?', id: 'item-new' },
    });

    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('Keep going');
    expect(updated.label).toBe('Keep going?');
  });

  it('does not rewrite a synthetic geolocation formikKey when the visible label changes', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'b58b0000-0000-4000-8000-000000000001',
      fieldType: 'input',
      label: 'Continue in the program?',
      formikKey: 'geolocation_b58b',
    };

    render(
      <Input
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Enter your question here'), {
      target: { value: 'Keep going?', id: 'b58b0000-0000-4000-8000-000000000001' },
    });

    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('geolocation_b58b');
    expect(updated.label).toBe('Keep going?');
  });
});
