import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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

jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Input', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Select', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Header', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Geolocation', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Loop', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/index.module.scss', () => ({ block: 'block' }));

const PaperInputPicker = require('app/epics/FormCreator/FormTemplate/InputPicker').default;

const mockProvided = {
  draggableProps: { 'data-rbd-draggable-id': 'test-item' },
  dragHandleProps: { 'data-rbd-drag-handle-draggable-id': 'test-item' },
};
const mockItem = { id: 'item-1', fieldType: 'input', label: 'Test question' };

function renderComponent() {
  return render(
    <PaperInputPicker
      provided={mockProvided}
      innerRef={null}
      item={mockItem}
      formItems={[mockItem]}
      setFormItems={jest.fn()}
      removeValue={jest.fn()}
      onSelectBlock={jest.fn()}
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
    expect(screen.getByRole('button', { name: /drag to reorder/i })).toBeInTheDocument();
  });
});
