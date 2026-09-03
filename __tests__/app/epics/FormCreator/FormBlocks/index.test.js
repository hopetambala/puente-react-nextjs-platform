import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('react-beautiful-dnd', () => ({
  Droppable: ({ children }) => children(
    { innerRef: jest.fn(), droppableProps: {}, placeholder: null },
    { isDraggingOver: false },
  ),
  Draggable: ({ children }) => children(
    { innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} },
    { isDragging: false },
  ),
}));

const FormBlocks = require('app/epics/FormCreator/FormBlocks').default;

// COLLECTION uses object properties (`textKey:` / `infoTextKey:`), not JSX
// props, so the design-check detector's regex never saw the originals: the
// whole block palette rendered in English beside a fully translated
// form-settings card, and only a screenshot of the Creole page found it.
const items = [
  { id: 'b1', textKey: 'form_creator_type_number', fieldType: 'numberInput', infoTextKey: 'form_creator_hint_number' },
  { id: 'b2', textKey: 'form_creator_type_geolocation', fieldType: 'geolocation', infoTextKey: 'form_creator_hint_geolocation' },
];

describe('FormBlocks — palette copy', () => {
  it('routes each block label through t()', () => {
    render(<FormBlocks items={items} />);
    expect(screen.getByText('form_creator_type_number')).toBeInTheDocument();
    expect(screen.getByText('form_creator_type_geolocation')).toBeInTheDocument();
  });

  it('routes each block tooltip through t()', () => {
    render(<FormBlocks items={items} />);
    // MUI's Tooltip forwards `title` to the child button as a title attribute.
    expect(screen.getByTitle('form_creator_hint_number')).toBeInTheDocument();
  });
});
