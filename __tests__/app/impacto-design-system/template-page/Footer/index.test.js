import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('app/impacto-design-system/template-page/Footer/index.module.scss', () => ({}));

const Footer = require('app/impacto-design-system/template-page/Footer').default;

describe('Footer — copy', () => {
  it('routes the tagline through t()', () => {
    render(<Footer />);
    expect(screen.getByText('footer_tagline')).toBeInTheDocument();
  });

  // The alt text said "Vercel Logo" — left over from the Next.js starter, on an
  // image that is Puente's own logo. A screen reader announced the wrong company.
  it('describes the logo it actually shows', () => {
    render(<Footer />);
    expect(screen.getByAltText('footer_logo_alt')).toBeInTheDocument();
  });
});
