/**
 * Does this form have a research file this user can download?
 *
 * The one rule the Form Manager badge, the expanded-row notes and the export
 * buttons all use, so they can never disagree. The research route is keyed on
 * shortCode, so an organization that does not resolve has no research file
 * even when the form allows one.
 */
const offersResearchExport = (form, shortCode) => Boolean(
  form.customForm === true && form.allowResearchExport === true && shortCode,
);

export default offersResearchExport;
