import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <>{children}</>,
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children(
    {
      innerRef: () => {},
      draggableProps: { 'data-rbd-draggable-id': 'test-item' },
      dragHandleProps: { 'data-rbd-drag-handle-draggable-id': 'test-item' },
    },
    {}
  ),
}));

jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Input', () => jest.fn(() => null));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Select', () => jest.fn(() => null));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Header', () => jest.fn(() => null));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Geolocation', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Loop', () => jest.fn(() => null));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/index.module.scss', () => ({ block: 'block' }));

const PaperInputPicker = require('app/epics/FormCreator/FormTemplate/InputPicker').default;

const mockProvided = {
  draggableProps: { 'data-rbd-draggable-id': 'test-item' },
  dragHandleProps: { 'data-rbd-drag-handle-draggable-id': 'test-item' },
};
const mockItem = { id: 'item-1', fieldType: 'input', label: 'Test question' };

function renderComponent(onSelectBlock = jest.fn(), extraProps = {}) {
  return render(
    <PaperInputPicker
      provided={mockProvided}
      innerRef={null}
      item={mockItem}
      formItems={[mockItem]}
      setFormItems={jest.fn()}
      removeValue={jest.fn()}
      onSelectBlock={onSelectBlock}
      {...extraProps}
    />
  );
}

describe('drag handle refactor', () => {
  it('renders a dedicated drag handle element', () => {
    renderComponent();
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });

  it('drag handle props are on the drag handle element, not the outer block', () => {
    const { container } = renderComponent();
    const outerBlock = container.firstChild;
    expect(outerBlock).not.toHaveAttribute('data-rbd-drag-handle-draggable-id');
    expect(screen.getByTestId('drag-handle')).toHaveAttribute(
      'data-rbd-drag-handle-draggable-id',
      'test-item'
    );
  });

  it('outer block still has draggable props', () => {
    const { container } = renderComponent();
    expect(container.firstChild).toHaveAttribute('data-rbd-draggable-id', 'test-item');
  });
});

describe('drag handle accessibility', () => {
  it('drag handle is a button so it is keyboard-focusable and correctly announced by assistive tech', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'form_creator_drag_to_reorder' })).toBeInTheDocument();
  });
});

describe('block selection is reachable without a mouse', () => {
  it('selects the block when keyboard focus enters it', () => {
    const onSelectBlock = jest.fn();
    renderComponent(onSelectBlock);

    fireEvent.focusIn(screen.getByTestId('drag-handle'));

    expect(onSelectBlock).toHaveBeenCalledWith(mockItem);
  });

  // Clicking a block's chrome selects it without moving focus, so the caret can
  // still sit in a different block's input. Typing must re-select the block the
  // caret is actually in, or the Inspector edits the wrong question.
  it('selects the block when a key is pressed inside it', () => {
    const onSelectBlock = jest.fn();
    renderComponent(onSelectBlock);

    fireEvent.keyDown(screen.getByTestId('drag-handle'), { key: 'a' });

    expect(onSelectBlock).toHaveBeenCalledWith(mockItem);
  });

  // The wrapper only exists for drag-and-drop and card styling; its children
  // carry the semantics. Marking it presentational is what makes the selection
  // handlers legitimate instead of a static div with a click handler.
  it('marks the block wrapper as presentational', () => {
    const { container } = renderComponent();
    expect(container.firstChild).toHaveAttribute('role', 'presentation');
  });
});

describe('keyFrozen prop', () => {
  it('forwards keyFrozen to Input, Select, Header, and Loop', () => {
    const Input = require('app/epics/FormCreator/FormTemplate/InputPicker/Input');
    const Select = require('app/epics/FormCreator/FormTemplate/InputPicker/Select');
    const Header = require('app/epics/FormCreator/FormTemplate/InputPicker/Header');
    const Loop = require('app/epics/FormCreator/FormTemplate/InputPicker/Loop');

    renderComponent(jest.fn(), { keyFrozen: true });

    [Input, Select, Header, Loop].forEach((Component) => {
      expect(Component).toHaveBeenCalledWith(
        expect.objectContaining({ keyFrozen: true }),
        expect.anything(),
      );
    });
  });
});

describe('InputPicker — copy', () => {
  it('routes the drag-handle label through t()', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'form_creator_drag_to_reorder' })).toBeInTheDocument();
  });
});
