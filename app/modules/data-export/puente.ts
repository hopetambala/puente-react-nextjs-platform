import { CustomDataExporter, DataExporter, ENDPOINTS } from './_types'

export const SurveyData = new DataExporter(ENDPOINTS['Main']) 
export const EnvironmentalHealth = new DataExporter(ENDPOINTS['EnvironmentalHealth']) 
export const Vitals = new DataExporter(ENDPOINTS['Vitals'])
export const EvaluationMedical = new DataExporter(ENDPOINTS['EvaluationMedical'])

export const CustomData = new CustomDataExporter()