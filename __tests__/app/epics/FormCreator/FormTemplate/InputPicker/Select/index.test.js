import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));

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

    expect(screen.getByText('form_creator_option_n(n=1)')).toBeInTheDocument();
    expect(screen.getByText('form_creator_option_n(n=2)')).toBeInTheDocument();

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
    const removeButtons = screen.getAllByText('form_creator_remove_option');
    fireEvent.click(removeButtons[0]);

    expect(mockSetFormItems).toHaveBeenCalled();

    const callArg = mockSetFormItems.mock.calls[0][0];
    expect(callArg[0].options).toEqual([optionB]);
  });
});

describe('question label edit', () => {
  // Converted geolocation block: editing the question text used to run
  // toFormikKey on the new label and rewrite option textKeys. Historical
  // FormResults stayed on geolocation_b58b / __geolocation_b58b__Yes; new
  // submissions wrote a new title. The CSV grew an empty historical column
  // next to a full live column.
  it('does not rewrite a synthetic geolocation formikKey when the visible label changes', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'b58b0000-0000-4000-8000-000000000001',
      fieldType: 'select',
      label: 'Continue in the program?',
      formikKey: 'geolocation_b58b',
      options: [{
        id: 'opt-a',
        label: 'Yes',
        value: 'Yes',
        text: false,
        textQuestion: '',
        textKey: '__geolocation_b58b__Yes',
      }],
    };

    render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('form_creator_question_placeholder'), {
      target: { value: 'Keep going?', id: 'b58b0000-0000-4000-8000-000000000001' },
    });

    expect(mockSetFormItems).toHaveBeenCalled();
    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('geolocation_b58b');
    expect(updated.label).toBe('Keep going?');
    expect(updated.options[0].textKey).toBe('__geolocation_b58b__Yes');
  });

  it('keeps formikKey on a saved form even when the key currently matches the label', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'item-saved',
      fieldType: 'select',
      label: 'Continue in the program',
      formikKey: 'Continue in the program',
      options: [{
        id: 'opt-a',
        label: 'Yes',
        value: 'Yes',
        text: false,
        textQuestion: '',
        textKey: '__Continue in the program__Yes',
      }],
    };

    render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
        keyFrozen
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('form_creator_question_placeholder'), {
      target: { value: 'Keep going?', id: 'item-saved' },
    });

    expect(mockSetFormItems).toHaveBeenCalled();
    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('Continue in the program');
    expect(updated.label).toBe('Keep going?');
    expect(updated.options[0].textKey).toBe('__Continue in the program__Yes');
  });

  it('updates formikKey on an unsaved form while the key is still in sync', () => {
    const mockSetFormItems = jest.fn();
    const item = {
      id: 'item-new',
      fieldType: 'select',
      label: 'Continue in the program',
      formikKey: 'Continue in the program',
      options: [{
        id: 'opt-a',
        label: 'Yes',
        value: 'Yes',
        text: false,
        textQuestion: '',
        textKey: '__Continue in the program__Yes',
      }],
    };

    render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={mockSetFormItems}
        removeValue={jest.fn()}
        keyFrozen={false}
      />
    );
    mockSetFormItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText('form_creator_question_placeholder'), {
      target: { value: 'Keep going?', id: 'item-new' },
    });

    const updated = mockSetFormItems.mock.calls[0][0][0];
    expect(updated.formikKey).toBe('Keep going');
    expect(updated.label).toBe('Keep going?');
    expect(updated.options[0].textKey).toBe('__Keep going__Yes');
  });
});

describe('Select block — copy', () => {
  function renderType(fieldType, optionOverrides = {}) {
    const item = {
      id: `s-${fieldType}`,
      fieldType,
      label: '',
      options: [{ id: 'opt-1', value: 'Option 1', text: false, ...optionOverrides }],
    };
    return render(
      <Select
        item={item}
        formItems={[item]}
        setFormItems={jest.fn()}
        removeValue={jest.fn()}
      />,
    );
  }

  it.each([
    ['select', 'form_creator_type_single_select'],
    ['selectMulti', 'form_creator_type_multi_select'],
  ])('routes the %s heading through t()', (fieldType, key) => {
    renderType(fieldType);
    expect(screen.getByRole('heading', { name: key })).toBeInTheDocument();
  });

  // The single- and multi-select branches are near-identical markup. They share
  // the option-editing keys so the two cannot drift apart in translation while
  // both still look right in English.
  it.each(['select', 'selectMulti'])('routes the option controls on %s through t()', (fieldType) => {
    renderType(fieldType);
    expect(screen.getByRole('button', { name: 'form_creator_add_option' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'form_creator_remove_option' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'form_creator_add_followup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'form_creator_remove_question' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('form_creator_question_placeholder')).toBeInTheDocument();
  });

  it('routes the remove-followup control through t()', () => {
    renderType('select', { text: true, textQuestion: '' });
    expect(screen.getByRole('button', { name: 'form_creator_remove_followup' })).toBeInTheDocument();
  });

  // Both of these built an English sentence around a number with a template
  // literal, which no translator can reorder.
  it('interpolates the option number rather than concatenating it', () => {
    renderType('select');
    expect(screen.getByRole('heading', { name: 'form_creator_option_n(n=1)' })).toBeInTheDocument();
  });

  it('interpolates the option number into the follow-up question heading', () => {
    renderType('select', { text: true, textQuestion: '' });
    expect(
      screen.getByRole('heading', { name: 'form_creator_followup_question_n(n=1)' }),
    ).toBeInTheDocument();
  });
});
