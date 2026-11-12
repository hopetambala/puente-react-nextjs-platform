import '@testing-library/jest-dom';
import {
  act, fireEvent, render, screen, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// toast() + ToastRegion replace react-toastify. What matters for access:
// messages land in live regions that exist before them (so they're announced),
// errors go in the assertive one and never time out (WCAG 2.2.1, 4.1.3), and
// the rest time out only while nobody is reading them.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const ToastRegion = require('app/impacto-design-system/toast/ToastRegion').default;
const { toast, resetToastsForTests } = require('app/impacto-design-system/toast/notify');

beforeEach(() => {
  jest.useFakeTimers();
  act(() => resetToastsForTests());
});
afterEach(() => jest.useRealTimers());

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('ToastRegion', () => {
  it('has both live regions before any toast arrives', () => {
    render(<ToastRegion />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('puts confirmations in the polite status region', () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export started' }); });
    expect(within(screen.getByRole('status')).getByText('Export started')).toBeInTheDocument();
  });

  it('puts errors in the assertive alert region', () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export failed', isError: true }); });
    expect(within(screen.getByRole('alert')).getByText('Export failed')).toBeInTheDocument();
  });

  it('dismisses a confirmation after a while', () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export started' }); });
    act(() => { jest.advanceTimersByTime(8000); });
    expect(screen.queryByText('Export started')).not.toBeInTheDocument();
  });

  it('never times out an error', () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export failed', isError: true }); });
    act(() => { jest.advanceTimersByTime(60000); });
    expect(screen.getByText('Export failed')).toBeInTheDocument();
  });

  it('holds a confirmation while the pointer is over it', () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export started' }); });
    // fireEvent rather than userEvent.hover: the latter doesn't settle under
    // fake timers. mouseover is what a browser sends, and it bubbles to the
    // toast's listener.
    act(() => { fireEvent.mouseOver(screen.getByText('Export started')); });
    act(() => { jest.advanceTimersByTime(20000); });
    expect(screen.getByText('Export started')).toBeInTheDocument();
  });

  it('dismisses from its Dismiss button', async () => {
    render(<ToastRegion />);
    act(() => { toast({ text: 'Export failed', isError: true }); });
    await user().click(screen.getByRole('button', { name: 'action_dismiss' }));
    expect(screen.queryByText('Export failed')).not.toBeInTheDocument();
  });

  it('has no axe violations with toasts showing', async () => {
    jest.useRealTimers();
    const { container } = render(<ToastRegion />);
    act(() => {
      toast({ text: 'Export started' });
      toast({ text: 'Export failed', isError: true });
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
