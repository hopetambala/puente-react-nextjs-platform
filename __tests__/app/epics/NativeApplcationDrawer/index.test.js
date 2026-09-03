import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
}));
jest.mock('app/epics/NativeApplcationDrawer/NativeApp', () => () => <div />);
jest.mock('app/epics/NativeApplcationDrawer/index.module.css', () => ({}), { virtual: true });

const Drawer = require('app/epics/NativeApplcationDrawer').default;

describe('NativeApplicationDrawer — copy', () => {
  it('reuses the shared close key rather than minting its own', () => {
    render(<Drawer isOpen onClose={jest.fn()} formItems={[]} />);
    expect(screen.getByRole('button', { name: 'action_close' })).toBeInTheDocument();
  });
});
