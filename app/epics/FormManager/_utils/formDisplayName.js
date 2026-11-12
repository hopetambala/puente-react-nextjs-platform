/**
 * The name a coordinator sees for a form.
 *
 * A Puente form is a Parse class ("SurveyData", "HistoryEnvironmentalHealth")
 * and carries a `labelKey`: it is shown by the same translated name data
 * curation uses for it (design review X14). A custom form's name is its
 * author's, and is shown as written.
 *
 * @param {{ name?: string, labelKey?: string }} form
 * @param {(key: string) => string} t
 * @returns {string}
 */
export default function formDisplayName(form, t) {
  return form.labelKey ? t(form.labelKey) : (form.name || '');
}
