import '@testing-library/jest-dom';

import { render } from '@testing-library/react';
import MyDocument from 'pages/_document';
import React from 'react';

jest.mock('@material-ui/core/styles', () => ({
  ServerStyleSheets: class { collect(x) { return x; } getStyleElement() { return null; } },
}));
jest.mock('app/modules/theme', () => ({ palette: { primary: { main: '#000' } } }));
jest.mock('next/document', () => {
  const Real = require('react');
  class Document extends Real.Component {}
  Document.getInitialProps = async () => ({ styles: [] });
  return {
    __esModule: true,
    default: Document,
    // `lang` is the whole point of this test, so it has to reach the DOM.
    Html: ({ children, ...rest }) => <div data-testid="html" {...rest}>{children}</div>,
    Head: ({ children }) => <div>{children}</div>,
    Main: () => <div />,
    NextScript: () => <div />,
  };
});

// Next.js does not set <Html lang> for you. It was hardcoded to "en", so every
// Spanish and Haitian Creole page announced itself to screen readers as
// English — and shipping real translations is what made that a live defect
// rather than a latent one.
describe('_document', () => {
  it('declares the active locale as a BCP 47 tag, not the routing id', () => {
    const { getByTestId } = render(<MyDocument locale="spa" />);
    expect(getByTestId('html')).toHaveAttribute('lang', 'es');
  });

  it('declares Haitian Creole correctly', () => {
    const { getByTestId } = render(<MyDocument locale="hat" />);
    expect(getByTestId('html')).toHaveAttribute('lang', 'ht');
  });

  it('falls back to English when no locale has been resolved', () => {
    const { getByTestId } = render(<MyDocument />);
    expect(getByTestId('html')).toHaveAttribute('lang', 'en');
  });
});

describe('_document getInitialProps', () => {
  it('passes the request locale through to render', async () => {
    const ctx = {
      locale: 'hat',
      renderPage: () => ({ html: '', head: [] }),
    };
    const props = await MyDocument.getInitialProps(ctx);
    expect(props.locale).toBe('hat');
  });
});
