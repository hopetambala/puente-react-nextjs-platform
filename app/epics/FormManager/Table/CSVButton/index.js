import Button from 'app/impacto-design-system/button';
import {
  CustomData, EnvironmentalHealth, EvaluationMedical, SurveyData, Vitals,
} from 'app/modules/data-export/puente';
import { useState } from 'react';

function openWindow(dataurl, filename) {
  const link = document.createElement('a');
  link.href = dataurl;
  link.download = filename;
  link.click();
}

const puenteMap = {
  SurveyData,
  HistoryEnvironmentalHealth: EnvironmentalHealth,
  Vitals,
  EvaluationMedical,
};

export default function CSVButtonWrapper({ form, surveyingOrganization }) {
  const { objectId: customFormId, customForm, name } = form;
  const [loading, setLoading] = useState(false);

  const fetchCSVData = () => {
    if (customForm) {
      return CustomData.getSpecificRecordsByOrganization(
        surveyingOrganization,
        customFormId,
      );
    }
    /**
     * This is a workaround for the SurveyData class, which has a different endpoint (v3)
     */
    if (name === 'SurveyData') {
      return SurveyData.getIdRecordByOrganization(surveyingOrganization);
    }
    return puenteMap[name].getRecordByOrganization(surveyingOrganization);
  };

  const fetchData = async () => {
    setLoading(true);
    const CSVData = await fetchCSVData().catch(() => {
      setLoading(false);
      alert('No data');
    });
    if (CSVData === undefined) return;
    const blob = new Blob([CSVData], { type: 'text/csv' });
    const csvUrl = window.URL.createObjectURL(blob);
    openWindow(csvUrl, `${name}-${new Date()}.csv`);
    setLoading(false);
  };

  return (
    <Button
      isSmall
      isLoading={loading}
      text={loading ? 'Loading…' : 'Export'}
      onClick={fetchData}
    />
  );
}
