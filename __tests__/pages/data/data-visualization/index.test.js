import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

// data-visualization is retired in the redesign — it permanently redirects to
// the Data Curation page. The old "Quick Insights" UI was unreachable behind
// that redirect (dead code Copilot flagged on PR #71) and has been removed.
const mod = require('pages/data/data-visualization/index');

describe('data-visualization redirect', () => {
  it('permanently redirects to /data/data-curation', () => {
    expect(mod.getServerSideProps()).toEqual({
      redirect: { destination: '/data/data-curation', permanent: true },
    });
  });

  it('renders nothing (dead Quick Insights UI removed; redirect runs server-side)', () => {
    const { container } = render(<mod.default />);
    expect(container).toBeEmptyDOMElement();
  });
});
