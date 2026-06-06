import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';

// ─── RED: reactive re-render when BehaviorSubject emits ──────────────────────
// parseUserValue() is a plain snapshot — it cannot trigger a re-render when the
// subject emits. useCurrentUser() must subscribe to the observable so that any
// component using it automatically re-renders with the latest user value.

jest.mock('app/modules/user', () => {
  const { BehaviorSubject } = require('rxjs');
  const subject = new BehaviorSubject(null);
  return {
    __esModule: true,
    default: {
      parseUser: () => subject.asObservable(),
      parseUserValue: () => subject.value,
    },
    __subject: subject, // exposed so tests can drive new emissions
  };
});

const userModule = require('app/modules/user');
const subject = userModule.__subject;
const useCurrentUser = require('app/modules/user/useCurrentUser').default;

describe('useCurrentUser', () => {
  beforeEach(() => {
    subject.next(null);
  });

  it('re-renders with the new user when the subject emits', () => {
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toBeNull();

    act(() => {
      subject.next({ organization: 'NewOrg' });
    });

    expect(result.current).toEqual({ organization: 'NewOrg' });
  });
});
