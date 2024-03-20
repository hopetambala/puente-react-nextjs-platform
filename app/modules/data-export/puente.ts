import { CustomDataExporter, DataExporter, ENDPOINTS } from './_types'

export const SurveyData = new DataExporter(ENDPOINTS['Main']) 

export const CustomData = new CustomDataExporter()