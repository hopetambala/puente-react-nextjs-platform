import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const calls = [];
const rec = (name) => (...args) => { calls.push([name, ...args]); return Promise.resolve('csv'); };

jest.mock('app/modules/data-export/puente', () => ({
  SurveyData: {
    getIdRecordByOrganization: (...a) => rec('SurveyData.byOrganization')(...a),
    getIdRecordByShortCode: (...a) => rec('SurveyData.byShortCode')(...a),
  },
  CustomData: {
    getSpecificRecordsByOrganization: (...a) => rec('Custom.byOrganization')(...a),
    getSpecificRecordsByShortCode: (...a) => rec('Custom.byShortCode')(...a),
  },
  EnvironmentalHealth: {}, EvaluationMedical: {}, Vitals: {},
}));

jest.mock('app/impacto-design-system/button', () => ({
  __esModule: true,
  default: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
}));

const CSVButton = require('app/epics/FormManager/Table/CSVButton/index').default;

describe('CSVButton export path', () => {
  beforeEach(() => { calls.length = 0; });

  it('exports by shortCode when the organization is known', async () => {
    // The single-organization path returned 12 CSV lines for DR Missions where
    // 623 exist, because 611 of its records carry the alias "DRMT".
    render(<CSVButton
      form={{ name: 'SurveyData', objectId: 'x' }}
      surveyingOrganization="DR Missions"
      shortCode="dr-missions"
    />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(calls[0]).toEqual(['SurveyData.byShortCode', 'dr-missions']));
  });

  it('falls back to the organization path when there is no shortCode', async () => {
    // 123 of 792 production accounts do not resolve to an organization. They
    // must still be able to export their own records.
    render(<CSVButton
      form={{ name: 'SurveyData', objectId: 'x' }}
      surveyingOrganization="Peace Corps"
      shortCode={null}
    />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(calls[0]).toEqual(['SurveyData.byOrganization', 'Peace Corps']));
  });

  it('keeps the formId when exporting a custom form by shortCode', async () => {
    render(<CSVButton
      form={{ name: 'Some Form', objectId: 'form-9', customForm: true }}
      surveyingOrganization="Rayjon"
      shortCode="rayjon"
    />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(calls[0]).toEqual(['Custom.byShortCode', 'rayjon', 'form-9']));
  });
});
