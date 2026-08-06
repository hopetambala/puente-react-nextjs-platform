import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import DataAssistant from 'app/epics/DataAssistant';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const mockSendMessage = jest.fn();
let mockChat;

jest.mock('app/epics/DataAssistant/useAssistantChat', () => () => mockChat);

describe('DataAssistant drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChat = {
      messages: [],
      sendMessage: mockSendMessage,
      isLoading: false,
      error: null,
    };
  });

  it('renders nothing when closed', () => {
    render(<DataAssistant open={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('data-assistant')).not.toBeInTheDocument();
  });

  it('renders the drawer with title and beta badge when open', () => {
    render(<DataAssistant open onClose={jest.fn()} />);
    expect(screen.getByTestId('data-assistant')).toBeInTheDocument();
    expect(screen.getByText('assistant_title')).toBeInTheDocument();
    expect(screen.getByText('assistant_beta')).toBeInTheDocument();
  });

  it('shows starter questions in the empty state and sends one on click', () => {
    render(<DataAssistant open onClose={jest.fn()} />);
    const starter = screen.getAllByTestId('starter-question')[0];
    fireEvent.click(starter);
    expect(mockSendMessage).toHaveBeenCalledWith(starter.textContent, expect.anything());
  });

  it('sends the typed message on submit', () => {
    render(<DataAssistant open onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText('assistant_placeholder');
    fireEvent.change(input, { target: { value: '¿Cuántas familias?' } });
    fireEvent.submit(screen.getByTestId('assistant-form'));
    expect(mockSendMessage).toHaveBeenCalledWith('¿Cuántas familias?', expect.anything());
  });

  it('renders user and assistant messages', () => {
    mockChat.messages = [
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'Hay 42 familias.' },
    ];
    render(<DataAssistant open onClose={jest.fn()} />);
    expect(screen.getByText('hola')).toBeInTheDocument();
    expect(screen.getByText('Hay 42 familias.')).toBeInTheDocument();
  });

  it('shows an error message when the request failed', () => {
    mockChat.error = 'Request failed (401)';
    render(<DataAssistant open onClose={jest.fn()} />);
    expect(screen.getByText('assistant_error')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<DataAssistant open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('assistant_close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('exposes the drawer as a modal dialog for assistive tech', () => {
    render(<DataAssistant open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose when the Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<DataAssistant open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
