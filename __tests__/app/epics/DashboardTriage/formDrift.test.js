import { detectFormDrift } from 'app/epics/DashboardTriage/formDrift';

// A spec declares fields as { label, formikKey }. A submission stores answers as
// { title, answer }, where `title` holds the spec's formikKey — NOT its label.
const spec = (id, fields) => ({ id, fields });
const result = (specId, titles) => ({ specId, titles });

describe('detectFormDrift', () => {
  it('finds no drift when every answered title matches a formikKey', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'Reading Program?', formikKey: 'Reading Program' }])],
      results: [result('f1', ['Reading Program'])],
    });

    expect(drift.driftedFormIds).toEqual([]);
    expect(drift.count).toBe(0);
  });

  it('flags a form whose submissions use a title no formikKey matches', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'Reading Program?', formikKey: 'Reading Program' }])],
      // Label was edited after these were collected; answers keep the old key.
      results: [result('f1', ['Reading Programme'])],
    });

    expect(drift.driftedFormIds).toEqual(['f1']);
    expect(drift.count).toBe(1);
  });

  it('does NOT flag a spec field that simply has no answers yet', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [
        { label: 'A', formikKey: 'A' },
        { label: 'B never answered', formikKey: 'B' },
      ])],
      results: [result('f1', ['A'])],
    });

    // An unanswered question is not drift — it is an unanswered question.
    expect(drift.count).toBe(0);
  });

  it('ignores a form that has no submissions at all', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'A', formikKey: 'A' }])],
      results: [],
    });

    expect(drift.count).toBe(0);
  });

  it('compares against the label too, so a label-keyed answer is not a false positive', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'Reading Program?', formikKey: 'Reading Program' }])],
      results: [result('f1', ['Reading Program?'])],
    });

    expect(drift.count).toBe(0);
  });

  it('counts each drifted form once, not once per bad title', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'A', formikKey: 'A' }])],
      results: [result('f1', ['X', 'Y', 'Z'])],
    });

    expect(drift.count).toBe(1);
  });

  it('handles a spec field with no formikKey without crashing', () => {
    const drift = detectFormDrift({
      specs: [spec('f1', [{ label: 'A' }, { label: 'B', formikKey: 'B' }])],
      results: [result('f1', ['B'])],
    });

    expect(drift.count).toBe(0);
  });
});
