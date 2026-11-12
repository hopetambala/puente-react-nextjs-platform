import { act, render, waitFor } from '@testing-library/react';

// @testing-library/react 12 has no renderHook: a one-line harness instead.
function renderHook(useHook) {
  const result = { current: null };
  function Harness() { result.current = useHook(); return null; }
  render(<Harness />);
  return { result };
}

// useAccount: load a _User's editable details, or say why it couldn't.
// Design review C7: a failed lookup left a spinner up forever.

jest.mock('app/modules/user', () => ({ retrieveUserByObjectId: jest.fn() }));
const { retrieveUserByObjectId } = require('app/modules/user');
const { useAccount } = require('app/modules/user/useAccount');

const FIELDS = ['firstname', 'email'];

beforeEach(() => jest.clearAllMocks());

describe('useAccount', () => {
  it('loads the named fields, with "" for any the account lacks', async () => {
    retrieveUserByObjectId.mockResolvedValue({ attributes: { firstname: 'Ada' } });
    const { result } = renderHook(() => useAccount('USR1', FIELDS));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.account).toEqual({ firstname: 'Ada', email: '' }));
    expect(result.current.loading).toBe(false);
    expect(result.current.errorKey).toBeNull();
  });

  it('does nothing without an account id', () => {
    const { result } = renderHook(() => useAccount(undefined, FIELDS));
    expect(retrieveUserByObjectId).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.account).toBeNull();
  });

  it('turns a failure into a catalog key, and retry loads again', async () => {
    retrieveUserByObjectId.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAccount('USR1', FIELDS));
    await waitFor(() => expect(result.current.errorKey).toBe('auth_error_offline'));
    expect(result.current.loading).toBe(false);
    retrieveUserByObjectId.mockResolvedValueOnce({ attributes: { firstname: 'Ada', email: 'a@b.c' } });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.account).toEqual({ firstname: 'Ada', email: 'a@b.c' }));
    expect(result.current.errorKey).toBeNull();
  });

  it('reports an expired session so the page can send the person to sign in', async () => {
    retrieveUserByObjectId.mockRejectedValueOnce(Object.assign(new Error('Invalid session token'), { code: 209 }));
    const { result } = renderHook(() => useAccount('USR1', FIELDS));
    await waitFor(() => expect(result.current.errorKey).toBe('auth_error_session'));
  });
});
