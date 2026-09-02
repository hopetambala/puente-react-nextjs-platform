import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Stack: ({ children }) => <div>{children}</div>,
  Table: () => <table />,
}));

jest.mock('app/modules/cloud-code', () => ({ basicQuery: jest.fn().mockResolvedValue([]) }));

const DataAnalyticsManager = require('app/epics/DataAnalyticsManager').default;

describe('DataAnalyticsManager — copy', () => {
  it('routes the retrieve action through t()', () => {
    render(<DataAnalyticsManager user={{ organization: 'TestOrg' }} />);
    expect(screen.getByRole('button', { name: 'analytics_retrieve' })).toBeInTheDocument();
  });
});
