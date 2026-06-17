import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Stack: ({ children }) => <div>{children}</div>,
}));

// Variable-backed Utils mock so individual tests can swap the implementation.
let utilsImpl = () => null;
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Utils', () =>
  jest.fn((props) => utilsImpl(props))
);

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Select/index.module.scss', () => ({}));

const Select = require('app/epics/FormCreator/FormTemplate/InputPicker/Select').default;

// This describe block MUST stay first in the file.
// React's ownerHasKeyUseWarning map deduplicates key-prop warnings by component
// name. Once any test renders Select with a key-less list item (including the
// single default option created by useState), subsequent renders of Select will
// never trigger console.error for missing keys again. Running this test first
// ensures the spy captures the very first emission of the warning.
describe('option key props', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not log a React key-prop warning when rendering multiple options', () => {
    const mockSetFormItems = jest.fn();
    const optA = { id: 'opt-a', label: 'Yes', value: 'Yes', text: false, textQuestion: '', textKey: '' };
    const optB = { id: 'opt-b', label: 'No', value: 'No', text: false, textQuestion: '', textKey: '' };
    const item = { id: 'item-1', fieldType: 'select', label: 'Q', formikKey: 'q', active: true, options: [optA, optB] };

    render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
      />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();

    const keyWarningCalls = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && (
        args[0].includes('Each child in a list') || args[0].includes('key')
      )
    );

    expect(keyWarningCalls).toHaveLength(0);
  });
});

describe('activeInput stale closure', () => {
  afterEach(() => {
    // Reset to no-op so other tests are not affected
    utilsImpl = () => null;
  });

  it('calls setFormItems with a functional updater, not a stale snapshot', async () => {
    let capturedSetActiveInput;
    utilsImpl = ({ setActiveInput }) => {
      capturedSetActiveInput = setActiveInput;
      return null;
    };

    const mockSetFormItems = jest.fn();
    const item = { id: 'item-1', fieldType: 'select', label: 'Q', formikKey: 'q', options: [] };
    const otherItem = { id: 'item-2', fieldType: 'input', label: 'Other', formikKey: 'other', active: true };

    render(
      <Select
        item={item}
        formItems={[item, otherItem]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
      />
    );

    mockSetFormItems.mockClear();

    await act(async () => {
      capturedSetActiveInput(false);
    });

    const calls = mockSetFormItems.mock.calls;
    const calledWithFunction = calls.some(([arg]) => typeof arg === 'function');
    expect(calledWithFunction).toBe(true);
  });
});

describe('removeOption', () => {
  it('syncs the removal to formItems via setFormItems', () => {
    const mockSetFormItems = jest.fn();
    const optionA = { id: 'opt-a', label: 'Yes', value: 'Yes', text: false, textQuestion: '', textKey: '' };
    const optionB = { id: 'opt-b', label: 'No', value: 'No', text: false, textQuestion: '', textKey: '' };
    const item = { id: 'item-1', fieldType: 'select', label: 'Test Q', formikKey: 'testq', options: [optionA, optionB] };

    render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
      />
    );

    // Clear calls from the mount useEffect (activeInput effect)
    mockSetFormItems.mockClear();

    // Click the first "Remove" button — this removes optionA
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    expect(mockSetFormItems).toHaveBeenCalled();

    const callArg = mockSetFormItems.mock.calls[0][0];
    expect(callArg[0].options).toEqual([optionB]);
  });
});
