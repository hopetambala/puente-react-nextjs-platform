import formRecordsQuery from 'app/epics/FormManager/_utils/formRecordsQuery';

// A recording stand-in for Parse.Query: which class, and every constraint.
function fakeParse() {
  const made = [];
  function Query(className) {
    this.className = className;
    this.calls = [];
    made.push(this);
  }
  ['equalTo', 'containedIn', 'descending'].forEach((name) => {
    Query.prototype[name] = function record(...args) {
      this.calls.push([name, ...args]);
      return this;
    };
  });
  return { Parse: { Query }, made };
}

const HOF = ['WOF', 'HOF'];

describe('formRecordsQuery: which records a form card shows and counts', () => {
  // Field report, 2026-11-06: a WOF coordinator saw "0 collected" on Vitals
  // with 14,799 WOF vitals in the database. Vitals live in their own class.
  it('reads a Puente form from its own class, not SurveyData', () => {
    const { Parse } = fakeParse();
    const q = formRecordsQuery(Parse, { name: 'Vitals', description: '' }, HOF);
    expect(q.className).toBe('Vitals');
  });

  it.each(['SurveyData', 'HistoryEnvironmentalHealth', 'Vitals', 'EvaluationMedical'])(
    'maps the %s card to the %s class',
    (name) => {
      const { Parse } = fakeParse();
      expect(formRecordsQuery(Parse, { name }, HOF).className).toBe(name);
    },
  );

  // Custom-form answers are FormResults keyed by formSpecificationsId. The old
  // drill-in asked SurveyData for `formSpecification` and showed 0 of 561.
  it('reads a custom form from FormResults by formSpecificationsId', () => {
    const { Parse } = fakeParse();
    const q = formRecordsQuery(Parse, { objectId: 'MYt04Zp4ok', name: 'Seguimiento', customForm: true }, ['CMM']);
    expect(q.className).toBe('FormResults');
    expect(q.calls).toContainEqual(['equalTo', 'formSpecificationsId', 'MYt04Zp4ok']);
  });

  // The old drill-in had no organization filter at all: an HOF login was shown
  // 44,038 patients from every organization.
  it('scopes to every name the organization goes by', () => {
    const { Parse } = fakeParse();
    const q = formRecordsQuery(Parse, { name: 'Vitals' }, HOF);
    expect(q.calls).toContainEqual(['containedIn', 'surveyingOrganization', HOF]);
  });

  it('lists the most recently collected first', () => {
    const { Parse } = fakeParse();
    const q = formRecordsQuery(Parse, { name: 'Vitals' }, HOF);
    expect(q.calls).toContainEqual(['descending', 'createdAt']);
  });

  // No scope must mean no query, never an unscoped one.
  it.each([[undefined], [null], [[]]])('builds nothing without an organization scope (%p)', (values) => {
    const { Parse, made } = fakeParse();
    expect(formRecordsQuery(Parse, { name: 'Vitals' }, values)).toBeNull();
    expect(made).toHaveLength(0);
  });

  // `equalTo(key, undefined)` in the Parse SDK means "key does not exist":
  // a form with no id must never turn into a query for everything.
  it('builds nothing for a form that is neither a Puente form nor has an id', () => {
    const { Parse, made } = fakeParse();
    expect(formRecordsQuery(Parse, { name: 'Something else' }, HOF)).toBeNull();
    expect(made).toHaveLength(0);
  });
});
