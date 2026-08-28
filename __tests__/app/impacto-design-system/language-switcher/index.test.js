import '@testing-library/jest-dom';

import LanguageSwitcher from 'app/impacto-design-system/language-switcher';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const push = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push, pathname: '/account/login', asPath: '/account/login', query: {}, locale: 'eng' }),
}));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

beforeEach(() => {
  push.mockClear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

describe('LanguageSwitcher', () => {
  it('names each language in that language, not in the current UI language', () => {
    render(<LanguageSwitcher />);

    // Someone who cannot read the current language must still recognise their
    // own. Rendering "Spanish"/"Haitian Creole" in English would fail exactly
    // the user this control exists for.
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kreyòl Ayisyen' })).toBeInTheDocument();
  });
});

describe('LanguageSwitcher — switching', () => {
  it('marks the active locale so the current choice is visible without colour', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Español' })).not.toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('routes to the chosen locale, keeping the user on the same page', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Español' }));

    expect(push).toHaveBeenCalledWith('/account/login', '/account/login', {
      locale: 'spa',
    });
  });

  it('persists the choice in NEXT_LOCALE so Accept-Language cannot override it', () => {
    // Without the cookie the choice survives exactly one navigation before
    // Next.js locale detection drags the user back to their browser language.
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Kreyòl Ayisyen' }));

    expect(document.cookie).toContain('NEXT_LOCALE=hat');
  });
});
