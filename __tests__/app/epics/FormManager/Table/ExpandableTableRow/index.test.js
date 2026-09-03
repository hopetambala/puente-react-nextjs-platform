import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars
      ? `${k}(${Object.entries(vars).map(([n, v]) => `${n}=${v}`).join(',')})`
      : k),
  }),
}));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

jest.mock('app/modules/cloud-code', () => ({
  customMultiParamCountService: jest.fn().mockResolvedValue(7),
}));

const ExpandableTableRow = require('app/epics/FormManager/Table/ExpandableTableRow').default;

function renderRow() {
  return render(
    <table>
      <tbody>
        <ExpandableTableRow row={{ objectId: 'f1' }} surveyingOrganization="TestOrg">
          <td>WaSH Survey</td>
        </ExpandableTableRow>
      </tbody>
    </table>,
  );
}

describe('ExpandableTableRow — copy', () => {
  it('routes both states of the expand toggle through t()', () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: 'form_manager_expand_row' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'form_manager_collapse_row' })).toBeInTheDocument();
  });

  it('interpolates the collected count rather than concatenating it', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'form_manager_expand_row' }));
    await waitFor(() => {
      expect(screen.getByText('form_manager_forms_collected(count=0)')).toBeInTheDocument();
    });
  });

  it('routes the refresh control through t()', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'form_manager_expand_row' }));
    expect(screen.getByRole('button', { name: 'action_refresh' })).toBeInTheDocument();
  });
});
