import '@testing-library/jest-dom';

const mockFetchCSV = jest.fn().mockResolvedValue('csv');
jest.mock('app/services/flask-api', () => ({ __esModule: true, default: (...a) => mockFetchCSV(...a) }));

const { CustomDataExporter, DataExporter, ENDPOINTS } = require('app/modules/data-export/_types');

describe('exporting by shortCode', () => {
  beforeEach(() => mockFetchCSV.mockClear());

  it('asks for the alias-aware path, not the single-organization one', async () => {
    // Verified in production: /v3/records/organizations/DR%20Missions returns
    // 12 CSV lines, /v3/records/short-code/dr-missions returns 623. The old
    // path silently exported 2% of that organization's data to funders.
    await new DataExporter(ENDPOINTS.Main).getIdRecordByShortCode('dr-missions');

    expect(mockFetchCSV).toHaveBeenCalledWith('v3/records/short-code/dr-missions');
  });

  it('uses the supplementary short-code path for the other families', async () => {
    await new DataExporter(ENDPOINTS.Vitals).getRecordByShortCode('rayjon');

    expect(mockFetchCSV).toHaveBeenCalledWith('v2/records-vitals/short-code/rayjon');
  });

  it('keeps the formId segment for custom forms', async () => {
    await new CustomDataExporter().getSpecificRecordsByShortCode('rayjon', 'form-9');

    expect(mockFetchCSV)
      .toHaveBeenCalledWith('v2/records-custom-forms/short-code/rayjon/form-9');
  });
});
