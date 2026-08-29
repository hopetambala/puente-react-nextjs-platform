import fetchCSV from "../../services/flask-api";

export enum ENDPOINTS {
  Main = "records",
  EnvironmentalHealth = "records-env",
  HistoryMedical = 'records-history-medical',
  EvaluationMedical = 'records-evaluation-medical',
  Vitals = 'records-vitals',
  Custom = 'records-custom-forms',
}

export class DataExporter {
  endpoint: ENDPOINTS
  constructor(endpoint: ENDPOINTS) {
    this.endpoint = endpoint
  }

  /**
   *
   * @param organization Surveying Organization like "Puente" or "WOF"
   * @returns All records in database related to this model and its surveyingOrganization
   */
  async getRecordByOrganization(organization: string) {
    const orgsData = await fetchCSV(
      `v2/${this.endpoint}/organizations/${organization}`
    )
    return orgsData
  }

  /**
   *
   * @param organization Surveying Organization like "Puente" or "WOF"
   * @returns All records in database related to this model and its surveyingOrganization
   */
  async getIdRecordByOrganization(organization: string) {
    const orgsData = await fetchCSV(
      `v3/${this.endpoint}/organizations/${organization}`
    )
    return orgsData
  }

  /**
   * Records for EVERY string this organization uses, keyed by shortCode.
   *
   * Verified in production 2026-08-29:
   *   /v3/records/organizations/DR%20Missions ->  12 CSV lines
   *   /v3/records/short-code/dr-missions      -> 623 CSV lines
   *
   * Records carry the string that was COLLECTED, so filtering on one name
   * exported 2% of that organization's data - into a CSV funders receive.
   *
   * shortCode rather than a list of names because names contain commas
   * ("Beahan, Cole and Wolf" is a real alias).
   */
  async getIdRecordByShortCode(shortCode: string) {
    return fetchCSV(`v3/${this.endpoint}/short-code/${shortCode}`)
  }

  /** As getIdRecordByShortCode, for the supplementary export families. */
  async getRecordByShortCode(shortCode: string) {
    return fetchCSV(`v2/${this.endpoint}/short-code/${shortCode}`)
  }

  /**
   * Rarely if ever to be used
   * @returns All records in database for this model
   */
  async getAllRecords() {
    const records = await fetchCSV(`v2/${this.endpoint}/`)
    return records
  }
}

export class CustomDataExporter extends DataExporter {
  constructor() {
    super(ENDPOINTS.Custom)
  }
   /** One custom form's results, for every string this organization uses. */
   async getSpecificRecordsByShortCode(shortCode:string, formId:string) {
    return fetchCSV(`v2/${this.endpoint}/short-code/${shortCode}/${formId}`)
  }

   async getSpecificRecordsByOrganization(organization:string, formId:string) {
    const orgsData = await fetchCSV(`v2/${this.endpoint}/organizations/${organization}/${formId}`)
    return orgsData;
  }

}