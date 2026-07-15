import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: failed export must not download a file ─────────────────────────────
// When the data fetch rejects (export API down / error), clicking Export must
// show the user an error and must NOT trigger a browser file download.

jest.mock('app/impacto-design-system/button', () => ({
  __esModule: true,
  default: ({ text, onClick, isDisabled }) => (
    <button type="button" disabled={isDisabled} onClick={onClick}>{text}</button>
  ),
}));

jest.mock('app/modules/data-export/puente', () => ({
  CustomData: { getSpecificRecordsByOrganization: jest.fn() },
  EnvironmentalHealth: { getRecordByOrganization: jest.fn() },
  EvaluationMedical: { getRecordByOrganization: jest.fn() },
  SurveyData: { getIdRecordByOrganization: jest.fn() },
  Vitals: { getRecordByOrganization: jest.fn() },
}));

const { SurveyData } = require('app/modules/data-export/puente');
const CSVButton = require('app/epics/FormManager/Table/CSVButton').default;

beforeEach(() => {
  jest.clearAllMocks();
  window.URL.createObjectURL = jest.fn();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  window.alert.mockRestore();
});

describe('CSVButton — export failure', () => {
  it('does not download a file and alerts the user when the fetch rejects', async () => {
    SurveyData.getIdRecordByOrganization.mockRejectedValue(new Error('API down'));

    render(
      <CSVButton
        form={{ objectId: 'form-1', customForm: false, name: 'SurveyData' }}
        surveyingOrganization="test-org"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('alerts and clears loading when the fetch resolves to undefined', async () => {
    SurveyData.getIdRecordByOrganization.mockResolvedValue(undefined);

    render(
      <CSVButton
        form={{ objectId: 'form-1', customForm: false, name: 'SurveyData' }}
        surveyingOrganization="test-org"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    // loading must be cleared — the button returns to its idle label
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument());
  });

  it('alerts and clears loading when the fetch throws synchronously', async () => {
    SurveyData.getIdRecordByOrganization.mockImplementation(() => {
      throw new Error('sync boom');
    });

    render(
      <CSVButton
        form={{ objectId: 'form-1', customForm: false, name: 'SurveyData' }}
        surveyingOrganization="test-org"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    // loading must be cleared even on a synchronous throw
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument());
  });
});
