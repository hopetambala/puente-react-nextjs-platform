import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: onSelectBlock not wired through FormTemplate ────────────────────────
// If onSelectBlock is removed from the props passed to InputPicker, clicking a
// canvas block never updates the inspector — caught before users wonder why
// the inspector stays blank after selecting a block.

jest.mock('react-beautiful-dnd', () => ({
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// InputPicker renders the clickable block; simulate click → call onSelectBlock
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker', () =>
  jest.fn(({ item, onSelectBlock }) => (
    <div
      data-testid={`block-${item.id}`}
      onClick={() => onSelectBlock && onSelectBlock(item)}
    >
      {item.text}
    </div>
  )));

const FormTemplate = require('app/epics/FormCreator/FormTemplate').default;

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  text: 'Water type question',
  fieldType: 'select',
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('onSelectBlock prop', () => {
  it('passes onSelectBlock to each InputPicker', () => {
    const InputPicker = require('app/epics/FormCreator/FormTemplate/InputPicker');
    const onSelectBlock = jest.fn();
    render(
      <FormTemplate
        formItems={[makeItem()]}
        setFormItems={jest.fn()}
        removeValue={jest.fn()}
        onSelectBlock={onSelectBlock}
      />,
    );
    expect(InputPicker).toHaveBeenCalledWith(
      expect.objectContaining({ onSelectBlock }),
      expect.anything(),
    );
  });

  it('calls onSelectBlock with the item when a block is clicked', async () => {
    const onSelectBlock = jest.fn();
    const item = makeItem();
    render(
      <FormTemplate
        formItems={[item]}
        setFormItems={jest.fn()}
        removeValue={jest.fn()}
        onSelectBlock={onSelectBlock}
      />,
    );
    await userEvent.click(screen.getByTestId('block-item-1'));
    expect(onSelectBlock).toHaveBeenCalledWith(item);
  });

  it('passes onSelectBlock to every item when multiple blocks exist', () => {
    const InputPicker = require('app/epics/FormCreator/FormTemplate/InputPicker');
    const onSelectBlock = jest.fn();
    const items = [
      makeItem({ id: 'item-1', text: 'Block 1' }),
      makeItem({ id: 'item-2', text: 'Block 2' }),
    ];
    render(
      <FormTemplate
        formItems={items}
        setFormItems={jest.fn()}
        removeValue={jest.fn()}
        onSelectBlock={onSelectBlock}
      />,
    );
    expect(InputPicker).toHaveBeenCalledTimes(2);
    InputPicker.mock.calls.forEach(([props]) => {
      expect(props.onSelectBlock).toBe(onSelectBlock);
    });
  });
});
