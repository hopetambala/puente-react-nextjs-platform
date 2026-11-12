import '@testing-library/jest-dom';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// Button, Icon, Tooltip and Spinner as a screen-reader and keyboard user meets
// them (docs/responsive-a11y-overhaul.md, PR 3).

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/link', () => {
  const React = require('react');
  return function MockLink({ href, children }) {
    return React.cloneElement(React.Children.only(children), { href });
  };
});

const Button = require('app/impacto-design-system/button').default;
const Icon = require('app/impacto-design-system/icon').default;
const Spinner = require('app/impacto-design-system/spinner').default;

describe('Button', () => {
  it('says it is busy while loading, and is not pressable', () => {
    render(<Button text="Export" isLoading />);
    const button = screen.getByRole('button', { name: 'Export' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('renders a disabled link as aria-disabled with no href, so it cannot be followed', () => {
    render(<Button text="Log in" href="/account/login" isDisabled />);
    const link = screen.getByText('Log in').closest('a');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('href');
  });

  it('opens a link in a new tab with target and rel when asked', () => {
    render(<Button text="Docs" href="https://example.org" shouldOpenHrefInNewTab />);
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('names an icon-only button by its text, which a tooltip shows but does not repeat', async () => {
    jest.useFakeTimers();
    render(<Button text="Delete question" icon="delete" isIconOnly />);
    const button = screen.getByRole('button', { name: 'Delete question' });
    act(() => { button.focus(); });
    const bubble = document.body.querySelector('[aria-hidden="true"]:not(svg)');
    expect(bubble).toHaveTextContent('Delete question');
    jest.useRealTimers();
  });

  it('has no axe violations in its states', async () => {
    const { container } = render(
      <div>
        <Button text="Save" intent="primary" />
        <Button text="Delete" intent="danger" />
        <Button text="Export" isLoading />
        <Button text="Delete question" icon="delete" isIconOnly />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Tooltip (via an icon-only Button)', () => {
  const setup = () => {
    jest.useFakeTimers();
    render(<Button text="Delete question" icon="delete" isIconOnly />);
    return screen.getByRole('button', { name: 'Delete question' });
  };
  const bubble = () => [...document.body.querySelectorAll('div[aria-hidden="true"]')]
    .find((el) => el.textContent === 'Delete question');
  afterEach(() => jest.useRealTimers());

  it('opens at once on keyboard focus and closes on blur', () => {
    const button = setup();
    act(() => { button.focus(); });
    expect(bubble()).toBeTruthy();
    act(() => { button.blur(); });
    expect(bubble()).toBeFalsy();
  });

  it('closes on Esc without moving focus (WCAG 1.4.13)', () => {
    const button = setup();
    act(() => { button.focus(); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(bubble()).toBeFalsy();
    expect(button).toHaveFocus();
  });

  it('opens after a short hover and stays while the pointer moves onto it', () => {
    const button = setup();
    act(() => { fireEvent.mouseEnter(button.parentElement); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(bubble()).toBeTruthy();
    act(() => { fireEvent.mouseLeave(button.parentElement); });
    act(() => { fireEvent.mouseEnter(bubble()); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(bubble()).toBeTruthy();
  });
});

describe('Icon', () => {
  it('is decorative: hidden from screen readers', () => {
    const { container } = render(<Icon name="delete" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Spinner', () => {
  it('is a status that says Loading through t()', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveTextContent('status_loading');
  });

  it('is silent when decorative', () => {
    render(<Spinner isDecorative />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
