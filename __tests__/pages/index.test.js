import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// The data-visualization / charts feature was removed and its route now
// redirects to Data Curation. The landing page must highlight the Data Curator,
// not the retired visualization / Quick Insights charts — guards against the
// marketing copy drifting back to a feature that no longer exists.
const { default: Homepage, getStaticProps } = require('pages/index');
const pkg = require('../../package.json');

const DOCS_URL = 'https://puente-dr.github.io/guides/';

describe('Landing page — highlights Data Curation', () => {
  it('markets Data Curation', () => {
    render(<Homepage />);
    expect(screen.getAllByText(/Data Curation/i).length).toBeGreaterThan(0);
  });

  it('no longer markets the removed Data Visualization / Quick Insights / charts feature', () => {
    render(<Homepage />);
    expect(screen.queryByText(/Data Visualization/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick Insights/i)).not.toBeInTheDocument();
  });

  it('uses no em dashes in copy (they read as AI-generated)', () => {
    const { container } = render(<Homepage />);
    expect(container.textContent).not.toMatch(/—/);
  });

  it('links changelog to the master branch', () => {
    render(<Homepage />);
    const changelogLink = screen.getByRole('link', { name: 'Changelog' });
    expect(changelogLink).toHaveAttribute(
      'href',
      'https://github.com/hopetambala/puente-react-nextjs-platform/blob/master/CHANGELOG.md',
    );
  });
});

// Leads from the onboarding guides work (2026-11-16): the landing page had
// dead links, a stale version line, copy for a block the builder doesn't
// offer, and footer links to the wrong places.
describe('Landing page — every link goes somewhere real', () => {
  it('has no dead href="#" links', () => {
    const { container } = render(<Homepage />);
    const dead = [...container.querySelectorAll('a')]
      .filter((a) => a.getAttribute('href') === '#')
      .map((a) => a.textContent.trim());
    expect(dead).toEqual([]);
  });

  it('points "Read the docs" at the onboarding guides', () => {
    render(<Homepage />);
    expect(screen.getByRole('link', { name: 'Read the docs' })).toHaveAttribute('href', DOCS_URL);
  });

  it('points the footer "Documentation" link at the guides, not the source repo', () => {
    render(<Homepage />);
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', DOCS_URL);
  });

  it('sends "Get the app" to the section with both store buttons', () => {
    const { container } = render(<Homepage />);
    const link = screen.getByRole('link', { name: /Get the app/ });
    const target = link.getAttribute('href');
    expect(target).toMatch(/^#.+/);
    const section = container.querySelector(target);
    expect(section).not.toBeNull();
    expect(section.querySelector('a[href^="https://apps.apple.com/"]')).not.toBeNull();
    expect(section.querySelector('a[href^="https://play.google.com/"]')).not.toBeNull();
  });

  it('points "See how it works" at the guide for that screen', () => {
    render(<Homepage />);
    expect(screen.getByRole('link', { name: /See how it works/ })).toHaveAttribute(
      'href',
      'https://puente-dr.github.io/guides/finding-someone-you-already-surveyed/',
    );
  });

  it('links dlite tokens to the repo npm names for the package', () => {
    render(<Homepage />);
    expect(screen.getByRole('link', { name: 'dlite tokens' }))
      .toHaveAttribute('href', 'https://github.com/hopetambala/style-dictionary-dlite');
  });
});

describe('Landing page — version line', () => {
  it('reads the web version from package.json at build time', async () => {
    const { props } = await getStaticProps();
    expect(props.appVersion).toBe(pkg.version);
  });

  it('shows the version it is given, and no hard-coded mobile version', () => {
    render(<Homepage appVersion="9.9.9" />);
    expect(screen.getByText('v9.9.9')).toBeInTheDocument();
    expect(screen.queryByText(/Mobile \d/)).not.toBeInTheDocument();
  });
});

describe('Landing page — Form Creator copy matches the palette', () => {
  it('does not promise loops, which the block palette does not offer', () => {
    const { container } = render(<Homepage />);
    expect(container.textContent).not.toMatch(/\bloops?\b/i);
  });
});
