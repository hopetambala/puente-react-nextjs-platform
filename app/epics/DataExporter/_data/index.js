import { customMultiParamQueryService } from 'app/modules/cloud-code';

// Puente Forms
// SurveyData, Vitals, Assets, EvaluationMedical, HistoryEnvironmentalHealth

const retrieveAllFormResults = async (parseForm, parseParams) => {
  try {
    const records = await customMultiParamQueryService(5000, parseForm, parseParams);
    const parsedRecords = JSON.parse(JSON.stringify(records));
    return parsedRecords;
  } catch (e) {
    return e;
  }
};

export default retrieveAllFormResults;
