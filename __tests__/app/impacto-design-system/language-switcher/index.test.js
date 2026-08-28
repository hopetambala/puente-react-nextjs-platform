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

describe('LanguageSwitcher — contract with the app config', () => {
  // The component keeps its own LANGUAGES list. Nothing tied it to
  // next-i18next.config.js, so adding a locale to the config and the catalogs
  // would leave the switcher silently unable to offer it — and the parity gate
  // would still pass, because parity is about keys, not about this list.
  it('offers exactly the locales next-i18next ships', () => {
    // eslint-disable-next-line global-require
    const { i18n } = require('../../../../next-i18next.config');
    render(<LanguageSwitcher />);

    const offered = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('data-locale'));

    expect(offered.sort()).toEqual([...i18n.locales].sort());
  });
});

describe('LanguageSwitcher — accessibility', () => {
  // `lang` takes a BCP 47 tag, which requires the SHORTEST available ISO 639
  // code. "spa"/"hat" are ISO 639-2/T and invalid here because "es"/"ht"
  // exist, so a screen reader would not switch pronunciation for the option.
  it('tags each option with a valid BCP 47 language, not the internal locale code', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('lang', 'es');
    expect(screen.getByRole('button', { name: 'Kreyòl Ayisyen' })).toHaveAttribute('lang', 'ht');
  });

  it('names the group without a hardcoded id, so two instances cannot collide', () => {
    const { container } = render(
      <div>
        <LanguageSwitcher />
        <LanguageSwitcher />
      </div>,
    );

    expect(screen.getAllByRole('group', { name: 'language' })).toHaveLength(2);

    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids).toEqual([...new Set(ids)]);
  });
});
