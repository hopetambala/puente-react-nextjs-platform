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

  const fetchData = async () => {
    setLoading(true);
    let CSVData;
    if (customForm) {
      CSVData = await CustomData.getSpecificRecordsByOrganization(
        surveyingOrganization,
        customFormId,
      ).catch(() => {
        setLoading(false);
        alert('No data');
      });
    } else {
      /**
       * This is a workaround for the SurveyData class, which has a different endpoint (v3)
       */
      if (name === 'SurveyData') {
        CSVData = await SurveyData.getIdRecordByOrganization(
          surveyingOrganization
        ).catch(() => {
          setLoading(false)
          alert('No data')
        })
      }
      else{
        const model = puenteMap[name]
        CSVData = await model
          .getRecordByOrganization(surveyingOrganization)
          .catch(() => {
            setLoading(false)
            alert('No data')
          })
      }
    }
    const blob = new Blob([CSVData], { type: 'text/csv' });
    const csvUrl = window.URL.createObjectURL(blob);
    openWindow(csvUrl, `${name}-${new Date()}.csv`);
    setLoading(false);
  };

  return (
    <Button
      intent="primary"
      isSmall
      isLoading={loading}
      text={loading ? 'Loading…' : 'Download CSV'}
      onClick={fetchData}
    />
  );
}
