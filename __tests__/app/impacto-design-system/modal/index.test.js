import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: Modal action does not fire callback ─────────────────────────────────
// If the action prop is disconnected from the action Button's onClick, the
// delete confirmation in FormManager silently does nothing — caught before
// users think they deleted a form but it's still there.

// ─── RED: Modal visible when open=false ──────────────────────────────────────
// If the open prop stops gating the MUI Modal, a confirmation dialog appears
// without the user clicking Delete — caught before the dialog is always visible.

jest.mock('@material-ui/core/Modal', () =>
  jest.fn(({ open, children }) => (open ? <div data-testid="modal-root">{children}</div> : null)));
jest.mock('@material-ui/core/styles', () => ({
  makeStyles: () => () => ({ paper: 'paper-class' }),
}));

// Modal imports Button/Card/Stack/Text from app/impacto-design-system — mock
// to avoid the circular dep and keep the test focused on Modal behavior.
jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick, intent }) => (
    <button type="button" data-intent={intent} onClick={onClick}>{text}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

const Modal = require('app/impacto-design-system/modal').default;

const defaultProps = {
  text: 'Do you want to remove this form?',
  actionText: 'Delete form',
  action: jest.fn(),
  handleClose: jest.fn(),
  intent: 'danger',
};

beforeEach(() => jest.clearAllMocks());

describe('Visibility', () => {
  it('renders the modal content when open is true', () => {
    render(<Modal {...defaultProps} open />);
    expect(screen.getByText('Do you want to remove this form?')).toBeInTheDocument();
  });

  it('renders nothing when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText('Do you want to remove this form?')).not.toBeInTheDocument();
  });
});

describe('Action button', () => {
  it('renders the actionText as the confirmation button label', () => {
    render(<Modal {...defaultProps} open />);
    expect(screen.getByText('Delete form')).toBeInTheDocument();
  });

  it('calls action when the confirmation button is clicked', async () => {
    const action = jest.fn();
    render(<Modal {...defaultProps} open action={action} />);
    await userEvent.click(screen.getByText('Delete form'));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('passes intent to the action button', () => {
    render(<Modal {...defaultProps} open intent="danger" />);
    expect(screen.getByText('Delete form').closest('button').dataset.intent).toBe('danger');
  });
});

describe('Prompt text', () => {
  it('displays the text prop as the confirmation question', () => {
    render(<Modal {...defaultProps} open text="Are you sure you want to proceed?" />);
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });
});
