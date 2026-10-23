import '@testing-library/jest-dom';

import fetchData from 'app/services/flask-api';
import { Parse } from 'parse';

jest.mock('parse', () => ({ Parse: { User: { current: jest.fn() } } }));

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

  // The export service serves identified patient records, so it checks who is
  // asking (puente-flask-rest-aggregator api/auth.py). The session Manage
  // already holds is the proof.
  it('sends the signed-in user\'s Parse session token', async () => {
    Parse.User.current.mockReturnValue({ getSessionToken: () => 'r:abc123' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'a,b\n' });

    await fetchData('v3/records/short-code/puente');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Parse-Session-Token']).toBe('r:abc123');
  });

  it('sends no session header when nobody is signed in, rather than the string "undefined"', async () => {
    Parse.User.current.mockReturnValue(null);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'a,b\n' });

    await fetchData('v3/records/short-code/puente');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty('X-Parse-Session-Token');
  });
});
