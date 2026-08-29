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

export default function CSVButtonWrapper({ form, surveyingOrganization, shortCode }) {
  const { objectId: customFormId, customForm, name } = form;
  const [loading, setLoading] = useState(false);

  // Prefer the shortCode path: it covers every string the organization's
  // records carry. Verified in production — DR Missions exported 12 CSV lines
  // by name and 623 by shortCode, because 611 of its records say "DRMT".
  //
  // Falls back to the organization name when there is no shortCode. 123 of 792
  // accounts do not resolve to an organization and must still be able to
  // export their own records.
  const fetchCSVData = () => {
    if (customForm) {
      return shortCode
        ? CustomData.getSpecificRecordsByShortCode(shortCode, customFormId)
        : CustomData.getSpecificRecordsByOrganization(surveyingOrganization, customFormId);
    }
    /**
     * This is a workaround for the SurveyData class, which has a different endpoint (v3)
     */
    if (name === 'SurveyData') {
      return shortCode
        ? SurveyData.getIdRecordByShortCode(shortCode)
        : SurveyData.getIdRecordByOrganization(surveyingOrganization);
    }
    return shortCode
      ? puenteMap[name].getRecordByShortCode(shortCode)
      : puenteMap[name].getRecordByOrganization(surveyingOrganization);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const CSVData = await fetchCSVData();
      if (CSVData === undefined) {
        alert('No data');
        return;
      }
      const blob = new Blob([CSVData], { type: 'text/csv' });
      const csvUrl = window.URL.createObjectURL(blob);
      openWindow(csvUrl, `${name}-${new Date()}.csv`);
    } catch (error) {
      alert('No data');
    } finally {
      setLoading(false);
    }
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
