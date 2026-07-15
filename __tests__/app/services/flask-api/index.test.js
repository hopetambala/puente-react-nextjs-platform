import '@testing-library/jest-dom';

import fetchData from 'app/services/flask-api';

describe('flask-api fetchData', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL = 'https://data-exporter.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('rejects with the HTTP status code when the response is not OK, instead of resolving with the error body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '{"message": "Internal Server Error"}',
    });

    await expect(fetchData('/exports/households')).rejects.toThrow(/500/);
  });
});
