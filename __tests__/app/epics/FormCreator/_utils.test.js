import { nextFormikKey, toFormikKey } from 'app/epics/FormCreator/_utils';

jest.mock('app/impacto-design-system', () => ({
  Card: ({ children }) => children,
}));
jest.mock('uuid', () => ({ v4: () => 'id' }));
jest.mock('app/epics/FormCreator/index.module.scss', () => ({}));

describe('toFormikKey', () => {
  it('strips punctuation but keeps spaces', () => {
    expect(toFormikKey('New label!')).toBe('New label');
  });
});

describe('nextFormikKey', () => {
  it('derives from the new label while the current key still matches the current label', () => {
    // Creation-time path: the steward is still typing the question, so the
    // key is allowed to follow the label.
    expect(nextFormikKey('Old label', 'Old label', 'New label!')).toBe('New label');
  });

  it('keeps a synthetic geolocation key when the visible label is edited', () => {
    // geolocation_b58b is what Collect already wrote as FormResults title.
    // Recalculating from a renamed label strands those rows under an empty
    // CSV column while new submits land on a different header.
    // `return toFormikKey(newLabel)` makes this assertion fail.
    expect(nextFormikKey(
      'geolocation_b58b',
      'Continue in the program?',
      'Keep going?',
    )).toBe('geolocation_b58b');
  });

  it('derives when there is no existing key', () => {
    expect(nextFormikKey('', '', 'Hello')).toBe('Hello');
  });

  it('keeps the existing key on a saved form even when it still matches the label', () => {
    // Canvas hole: an in-sync saved question renamed from InputPicker used to
    // re-derive. Collect already wrote fields[].title = "Continue in the
    // program"; a new key splits that history onto a second CSV column.
    expect(nextFormikKey(
      'Continue in the program',
      'Continue in the program',
      'Keep going?',
      true,
    )).toBe('Continue in the program');
  });

  it('derives on an unsaved form while the key is still in sync with the label', () => {
    expect(nextFormikKey(
      'Continue in the program',
      'Continue in the program',
      'Keep going?',
      false,
    )).toBe('Keep going');
  });

  it('falls back to toFormikKey on a saved form only when the key is empty', () => {
    expect(nextFormikKey('', 'Old', 'New label!', true)).toBe('New label');
  });

  it('still freezes a converted geolocation key when the form is saved', () => {
    expect(nextFormikKey(
      'geolocation_b58b',
      'Continue in the program?',
      'Keep going?',
      true,
    )).toBe('geolocation_b58b');
  });
});
