import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const calls = [];
let nextResponse = 'csv';
const rec = (name) => (...args) => { calls.push([name, ...args]); return Promise.resolve(nextResponse); };

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

jest.mock('app/impacto-design-system/toast', () => ({
  __esModule: true,
  default: ({ text, isError }) => <div data-testid="toast" data-error={!!isError}>{text}</div>,
}));

const toastCalls = [];
jest.mock('react-toastify', () => ({ toast: (node) => { toastCalls.push(node); } }));

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

const CSVButton = require('app/epics/FormManager/Table/CSVButton/index').default;

describe('CSVButton export path', () => {
  beforeEach(() => { calls.length = 0; nextResponse = 'csv'; });

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

describe('CSVButton empty export', () => {
  // Verified in production 2026-08-31: three of testORG's five custom forms
  // return HTTP 200 with a body of exactly "\n" — no header row, no data.
  // `CSVData === undefined` never catches it, so a coordinator gets a
  // correctly-named CSV that is completely empty and is told nothing. That is
  // indistinguishable from "my data disappeared".
  let createObjectURL;
  let anchorClick;

  beforeEach(() => {
    calls.length = 0;
    toastCalls.length = 0;
    nextResponse = 'csv';
    createObjectURL = jest.fn(() => 'blob:fake');
    window.URL.createObjectURL = createObjectURL;
    anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => { jest.restoreAllMocks(); });

  const renderButton = () => render(<CSVButton
    form={{ name: 'Practice Form', objectId: 'form-1', customForm: true }}
    surveyingOrganization="Constanza Medical Mission"
    shortCode="constanza-medical-mission"
  />);

  it.each([
    ['a bare newline', '\n'],
    ['an empty string', ''],
    ['only whitespace', '  \n  '],
  ])('does not download a file when the export body is %s', async (_label, body) => {
    nextResponse = body;
    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastCalls).toHaveLength(1));
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('still downloads when the export actually has rows', async () => {
    nextResponse = 'objectId,fname\nabc,Maria\n';
    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
    expect(toastCalls).toHaveLength(0);
  });

  it('tells the coordinator in their own language instead of a raw alert', async () => {
    // `alert('No data')` was untranslated English shown to Spanish- and
    // Creole-speaking coordinators, in a browser dialog the design system does
    // not own. The key is what must reach them; the locale files carry the copy.
    nextResponse = '\n';
    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastCalls).toHaveLength(1));
    expect(toastCalls[0].props.text).toBe('export_empty');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('distinguishes a failed export from an empty one', async () => {
    // "No data" was shown for both. A coordinator whose export CRASHED was told
    // their form was empty — which sends them looking for missing records
    // instead of retrying.
    nextResponse = Promise.reject(new Error('boom'));
    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toastCalls).toHaveLength(1));
    expect(toastCalls[0].props.text).toBe('export_failed');
    expect(toastCalls[0].props.isError).toBe(true);
  });

  it('treats a header-only CSV as data, because zero rows is a real answer', async () => {
    // The aggregator emits header-only CSVs on purpose (PR #116). That is a
    // legitimate empty result the coordinator should still be able to open.
    nextResponse = 'objectId,fname,lname\n';
    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(toastCalls).toHaveLength(0);
  });
});
