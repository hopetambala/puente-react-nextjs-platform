import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const Toast = require('app/impacto-design-system/toast').default;

describe('Toast — copy', () => {
  it('routes the dismiss control through t()', () => {
    render(<Toast text="Saved" />);
    expect(screen.getByRole('button', { name: 'action_dismiss' })).toBeInTheDocument();
  });
});
