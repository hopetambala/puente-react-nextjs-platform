import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// The data-visualization / charts feature was removed and its route now
// redirects to Data Curation. The landing page must highlight the Data Curator,
// not the retired visualization / Quick Insights charts — guards against the
// marketing copy drifting back to a feature that no longer exists.
const Homepage = require('pages/index').default;

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
