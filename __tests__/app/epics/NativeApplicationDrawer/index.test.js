import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('app/epics/NativeApplcationDrawer/NativeApp', () =>
  jest.fn(() => <div data-testid="native-app" />));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ children, onClick }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

const NativeDrawer = require('app/epics/NativeApplcationDrawer').default;

describe('Phase 9 — NativeApplicationDrawer: No MUI', () => {
  it('renders data-testid="native-drawer" when open', () => {
    render(<NativeDrawer isOpen onClose={jest.fn()} formItems={[]} />);
    expect(screen.getByTestId('native-drawer')).toBeInTheDocument();
  });

  it('does not render native-drawer when closed', () => {
    render(<NativeDrawer isOpen={false} onClose={jest.fn()} formItems={[]} />);
    expect(screen.queryByTestId('native-drawer')).not.toBeInTheDocument();
  });

  it('does not render any element with a Mui class', () => {
    const { container } = render(
      <NativeDrawer isOpen onClose={jest.fn()} formItems={[]} />,
    );
    expect(container.querySelector('[class*="Mui"]')).not.toBeInTheDocument();
  });
});
