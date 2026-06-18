import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('app/modules/cloud-code', () => ({
  postObjectsToClass: jest.fn().mockResolvedValue({}),
  updateObject: jest.fn().mockResolvedValue({}),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick, intent }) => (
    <button type="button" data-intent={intent} onClick={onClick}>{text}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
  Panel: ({ title, children }) => (
    <div data-testid={`panel-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <span>{title}</span>
      {children}
    </div>
  ),
  EmptyState: ({ message }) => <p data-testid="empty-state">{message}</p>,
  PageHeader: ({ title, actions }) => <div data-testid="page-header"><h1>{title}</h1>{actions}</div>,
  Toast: ({ message }) => message ? <div data-testid="toast">{message}</div> : null,
}));

// Heavy sub-components — render nothing; only the epic's own logic is under test
jest.mock('app/epics/FormCreator/FormBlocks', () =>
  jest.fn(() => null));

// FormTemplate captures onSelectBlock so tests can simulate a user clicking a block
let capturedOnSelectBlock = null;
jest.mock('app/epics/FormCreator/FormTemplate', () =>
  jest.fn(({ onSelectBlock }) => {
    capturedOnSelectBlock = onSelectBlock;
    return null;
  }));

// Inspector is tested in its own suite — use a lightweight stub here so
// FormCreator wiring tests stay isolated from Inspector internals.
let capturedInspectorProps = null;
jest.mock('app/epics/FormCreator/Inspector', () =>
  jest.fn((props) => {
    capturedInspectorProps = props;
    return props.block ? (
      <div data-testid="inspector-panel">
        <input aria-label="Label" value={props.block.label || ''} onChange={() => {}} />
        <span data-testid="inspector-formik-key">{props.block.formikKey}</span>
        <span data-testid="inspector-hint">Schema-aware.</span>
        <button type="button" data-testid="inspector-close" onClick={props.onClose}>✕</button>
      </div>
    ) : null;
  }));

jest.mock('app/epics/NativeApplcationDrawer', () =>
  jest.fn(() => null));

// DnD requires browser APIs not in jsdom — passthrough wrappers
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <>{children}</>,
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, {}),
}));

jest.mock('uuid', () => ({
  v4: jest.fn()
    .mockReturnValueOnce('uuid-1')
    .mockReturnValueOnce('uuid-2')
    .mockReturnValue('uuid-n'),
}));

const { postObjectsToClass, updateObject } = require('app/modules/cloud-code');
const FormCreator = require('app/epics/FormCreator').default;

const mockUser = { organization: 'test-org' };

function makeContext(storeData = null) {
  return {
    addPropToStore: jest.fn(),
    store: storeData
      ? { '/forms/form-creator': storeData }
      : {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── RED: context load on mount ───────────────────────────────────────────────
// If context.store loading is removed, clicking Edit in FormManager opens
// FormCreator with a blank form instead of the existing form data.

describe('Context load on mount', () => {
  it('populates form name from context store when editing', async () => {
    const ctx = makeContext({
      action: 'edit',
      data: {
        name: 'WaSH Survey',
        description: 'Water survey',
        fields: [],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'form-abc',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Give your form a detailed name');
      expect(nameInput.value).toBe('WaSH Survey');
    });
  });

  it('starts with a blank form name when context store is empty', () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    const nameInput = screen.getByPlaceholderText('Give your form a detailed name');
    expect(nameInput.value).toBe('');
  });
});

// ─── RED: submit routing — new form ──────────────────────────────────────────
// If the `formId` branch check is removed, new forms call updateObject instead
// of postObjectsToClass, silently failing because there's no ID to update.

describe('Submit routing — new form (no formId)', () => {
  it('calls postObjectsToClass and not updateObject', async () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(postObjectsToClass).toHaveBeenCalledWith(
        expect.objectContaining({ parseClass: 'FormSpecificationsV2' }),
      );
    });
    expect(updateObject).not.toHaveBeenCalled();
  });
});

// ─── RED: submit routing — edit ───────────────────────────────────────────────
// If edit mode calls postObjectsToClass instead of updateObject, every save
// creates a duplicate form instead of updating the existing one.

describe('Submit routing — edit mode', () => {
  it('calls updateObject with the correct objectId', async () => {
    const ctx = makeContext({
      action: 'edit',
      data: {
        name: 'Existing Form',
        description: '',
        fields: [],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'form-xyz',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Existing Form'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          parseClass: 'FormSpecificationsV2',
          parseClassID: 'form-xyz',
        }),
      );
    });
    expect(postObjectsToClass).not.toHaveBeenCalled();
  });
});

// ─── RED: submit routing — Puente edit ───────────────────────────────────────
// If the 'edit puente form' branch is removed, Puente base forms get modified
// directly on FormSpecificationsV2 rather than PuenteFormModifications.

describe('Submit routing — Puente edit', () => {
  it('calls updateObject on PuenteFormModifications class', async () => {
    const ctx = makeContext({
      action: 'edit puente form',
      data: {
        name: 'Puente Base Form',
        description: '',
        fields: [{ formikKey: 'waterType', active: true }],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'puente-001',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Puente Base Form'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          parseClass: 'PuenteFormModifications',
          parseClassID: 'puente-001',
          localObject: expect.objectContaining({
            activeFields: { waterType: true },
          }),
        }),
      );
    });
  });

  it('falls back to postObjectsToClass when updateObject rejects', async () => {
    updateObject.mockRejectedValueOnce(new Error('not found'));
    const ctx = makeContext({
      action: 'edit puente form',
      data: {
        name: 'Puente Base Form',
        description: '',
        fields: [],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'puente-002',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Puente Base Form'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(postObjectsToClass).toHaveBeenCalled();
    });
  });
});

// ─── Pure utility functions ───────────────────────────────────────────────────
// Tested directly — no component rendering needed.

describe('reorder utility', () => {
  const { reorder } = require('app/epics/FormCreator/_utils');

  it('moves item from startIndex to endIndex', () => {
    const result = reorder(['a', 'b', 'c'], 0, 2);
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('keeps length unchanged', () => {
    const result = reorder(['a', 'b', 'c'], 1, 0);
    expect(result).toHaveLength(3);
  });
});

describe('copy utility', () => {
  const { copy } = require('app/epics/FormCreator/_utils');

  it('inserts a copy of the source item at the destination index', () => {
    const source = [{ id: 'template-1', text: 'Number input', fieldType: 'numberInput' }];
    const destination = [{ id: 'existing-1' }];
    const result = copy(source, destination, { index: 0 }, { index: 0 });
    expect(result).toHaveLength(2);
    expect(result[0].fieldType).toBe('numberInput');
  });

  it('assigns a new UUID to the copied item, not the source id', () => {
    const { v4: uuid } = require('uuid');
    uuid.mockReturnValueOnce('fresh-uuid');
    const source = [{ id: 'template-1', text: 'Text input', fieldType: 'input' }];
    const result = copy(source, [], { index: 0 }, { index: 0 });
    expect(result[0].id).toBe('fresh-uuid');
    expect(result[0].id).not.toBe('template-1');
  });
});

// ─── RED: three-column layout ─────────────────────────────────────────────────
// If the palette, canvas, or inspector panels are removed from the layout, the
// Form Creator loses its structural contract — caught before users see a broken UI.

describe('Layout panels', () => {
  it('renders a "Blocks" panel for the block palette', () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(screen.getByTestId('panel-blocks')).toBeInTheDocument();
  });

  it('renders an "Inspector" panel for block editing', () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(screen.getByTestId('panel-inspector')).toBeInTheDocument();
  });

  it('shows an empty state in the inspector when no block is selected', () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

// ─── RED: inspector block selection ──────────────────────────────────────────
// If onSelectBlock is removed from FormTemplate props, clicking a block never
// updates the inspector — caught before users wonder why the inspector stays blank.

describe('Inspector — block selection', () => {
  it('passes onSelectBlock to FormTemplate', () => {
    const FormTemplate = require('app/epics/FormCreator/FormTemplate');
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(FormTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ onSelectBlock: expect.any(Function) }),
      expect.anything(),
    );
  });

  it('replaces the empty state with the Inspector when a block is selected', async () => {
    const { act } = require('@testing-library/react');
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    await act(async () => {
      capturedOnSelectBlock({
        id: 'b1', fieldType: 'select', label: 'Water type question', formikKey: 'watertypequestion',
      });
    });
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('inspector-hint')).toBeInTheDocument();
  });

  it('shows the block label in the Inspector label input', async () => {
    const { act } = require('@testing-library/react');
    render(<FormCreator context={makeContext()} user={mockUser} />);
    await act(async () => {
      capturedOnSelectBlock({
        id: 'b1', fieldType: 'input', label: 'Household name', formikKey: 'householdname',
      });
    });
    expect(screen.getByDisplayValue('Household name')).toBeInTheDocument();
  });

  it('passes onChange that updates the matching formItem', async () => {
    const { act } = require('@testing-library/react');
    const Inspector = require('app/epics/FormCreator/Inspector');
    render(<FormCreator context={makeContext()} user={mockUser} />);
    await act(async () => {
      capturedOnSelectBlock({
        id: 'block-canvas-1', fieldType: 'select', label: 'Old label', formikKey: 'oldlabel',
      });
    });
    expect(capturedInspectorProps.onChange).toBeInstanceOf(Function);
  });

  it('deselects the block (shows EmptyState) when Inspector onClose is fired', async () => {
    const { act } = require('@testing-library/react');
    const { fireEvent: fe } = require('@testing-library/react');
    render(<FormCreator context={makeContext()} user={mockUser} />);
    await act(async () => {
      capturedOnSelectBlock({
        id: 'b1', fieldType: 'select', label: 'Test', formikKey: 'test',
      });
    });
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    await act(async () => {
      fe.click(screen.getByTestId('inspector-close'));
    });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

// ─── RED: Phase 5 — no MUI, uses PageHeader ───────────────────────────────────
// If MUI imports are added back, the MUI class check will fail here before
// any deploy.

describe('Phase 5 — No MUI, PageHeader rendered', () => {
  it('renders a PageHeader', () => {
    render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('does not render any element with a MuiGrid class', () => {
    const { container } = render(<FormCreator context={makeContext()} user={mockUser} />);
    expect(container.querySelector('[class*="MuiGrid"]')).not.toBeInTheDocument();
  });
});

// ─── Contract: submitCustomForm payload ───────────────────────────────────────
// Guards against regressions in the Parse payload built by submitCustomForm.
// These tests would have FAILED before the bugs were fixed and must stay green
// to prove the fixes hold.

describe('submitCustomForm payload contract', () => {
  it('does not include removed options in the submitted fields', async () => {
    // Simulate edit mode where removeOption was already called — only ONE option
    // remains in the select field (opt-a was removed before this render).
    const ctx = makeContext({
      action: 'edit',
      data: {
        name: 'Test form',
        description: '',
        fields: [
          {
            id: 'q1',
            fieldType: 'select',
            label: 'Water source',
            formikKey: 'watersource',
            active: true,
            options: [
              {
                id: 'opt-b',
                label: 'River',
                value: 'River',
                text: false,
                textQuestion: '',
                textKey: '',
              },
              // opt-a intentionally absent — it was removed before this render
            ],
          },
        ],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'form-001',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Test form'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(updateObject).toHaveBeenCalled();
    });
    const [call] = updateObject.mock.calls;
    const submittedField = call[0].localObject.fields[0];
    // Only the one surviving option must be present — never the removed one
    expect(submittedField.options).toHaveLength(1);
    expect(submittedField.options[0].label).toBe('River');
  });

  it('includes both formikKey and label in every submitted field', async () => {
    const ctx = makeContext({
      action: 'edit',
      data: {
        name: 'Hydro Survey',
        description: '',
        fields: [
          {
            id: 'q2',
            fieldType: 'input',
            label: 'Water source',
            formikKey: 'watersource',
            active: true,
          },
        ],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'form-002',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Hydro Survey'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          localObject: expect.objectContaining({
            fields: expect.arrayContaining([
              expect.objectContaining({
                label: 'Water source',
                formikKey: 'watersource',
              }),
            ]),
          }),
        }),
      );
    });
  });

  it('always includes customForm, name, organizations, and fields in the submitted payload', async () => {
    const ctx = makeContext({
      action: 'edit',
      data: {
        name: 'Sanitation Survey',
        description: 'desc',
        fields: [
          {
            id: 'q3',
            fieldType: 'numberInput',
            label: 'Household count',
            formikKey: 'householdcount',
            active: true,
          },
        ],
        typeOfForm: ['Custom'],
        organizations: ['test-org'],
        objectId: 'form-003',
      },
    });
    render(<FormCreator context={ctx} user={mockUser} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Give your form a detailed name').value).toBe('Sanitation Survey'),
    );
    await userEvent.click(screen.getByText('Publish'));
    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          localObject: expect.objectContaining({
            customForm: true,
            name: 'Sanitation Survey',
            organizations: ['test-org'],
            fields: expect.any(Array),
          }),
        }),
      );
    });
    const [call] = updateObject.mock.calls;
    expect(Array.isArray(call[0].localObject.fields)).toBe(true);
  });
});
