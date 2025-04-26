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
    super(ENDPOINTS['Custom'])
  }
   async getSpecificRecordsByOrganization(organization:string, formId:string) {
    const orgsData = await fetchCSV(`v2/${this.endpoint}/organizations/${organization}/${formId}`)
    return orgsData;
  }

}