import Button from "app/impacto-design-system/button";
import { CustomData, EnvironmentalHealth, EvaluationMedical, SurveyData, Vitals } from "app/modules/data-export/puente";
import { useState } from "react";

function openWindow(dataurl, filename) {
  const link = document.createElement("a");
  link.href = dataurl;
  link.download = filename;
  link.click();
}

const puenteMap = {
  SurveyData: SurveyData,
  HistoryEnvironmentalHealth: EnvironmentalHealth,
  Vitals: Vitals,
  EvaluationMedical: EvaluationMedical,
};

export default function CSVButtonWrapper({ form, surveyingOrganization }) {
  const { objectId: customFormId, customForm, name } = form;
  const [loading, setLoading] = useState(false);

  const parameters = {
    specifier: customForm ? "FormResults" : name,
    surveyingOrganization,
    ...(customFormId && { customFormId }),
  };

  const fetchData = async () => {
    setLoading(true);
    let CSVData;
    if(customForm) {
    CSVData = await CustomData.getSpecificRecordsByOrganization(
        surveyingOrganization,
        customFormId
      ).catch(() => {
        setLoading(false);
        alert("No data");
      });
    }
    /***
     * NEED TO FIGURE OUT HOW TO GET REST OF PUENTE FORMS
     */
    else {
      const model = puenteMap[name];
      CSVData = await model
        .getRecordByOrganization(surveyingOrganization)
        .catch(() => {
          setLoading(false);
          alert("No data");
        });
    }
    const blob = new Blob([CSVData], { type: "text/csv" });
    const csvUrl = window.URL.createObjectURL(blob);
    openWindow(csvUrl, `${name}-${new Date()}.csv`);
    setLoading(false);
  };

  return (
    <Button
      intent="primary"
      isLoading={loading}
      text={loading ? "Loading" : "Download"}
      onClick={fetchData}
    />
  );
}
