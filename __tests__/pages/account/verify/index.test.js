import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: {} })),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Page: ({ children }) => <div data-testid="page">{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text }) => <span>{text}</span>,
}));

const Verify = require('pages/account/verify/index').default;

describe('Phase 8 — Verify page redesign', () => {
  it('renders data-testid="auth-brand" (brand column)', () => {
    render(<Verify />);
    expect(screen.getByTestId('auth-brand')).toBeInTheDocument();
  });

  it('renders data-testid="auth-form" (form column)', () => {
    render(<Verify />);
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });
});
