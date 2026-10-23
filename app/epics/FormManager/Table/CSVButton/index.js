import Button from 'app/impacto-design-system/button';
import Toast from 'app/impacto-design-system/toast';
import {
    CustomData, EnvironmentalHealth, EvaluationMedical, SurveyData, Vitals,
} from 'app/modules/data-export/puente';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { toast } from 'react-toastify';

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

const isoDate = () => new Date().toISOString().slice(0, 10);

export default function CSVButtonWrapper({ form, surveyingOrganization, shortCode }) {
  const {
    objectId: customFormId, customForm, name, allowResearchExport,
  } = form;
  const [loading, setLoading] = useState(null);
  const { t } = useTranslation('common');

  // The research route is keyed on shortCode, so an organization that does not
  // resolve gets the identified export only, exactly as before.
  const offersResearch = Boolean(customForm && allowResearchExport && shortCode);

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

  const download = async (kind, fetchCSV, filename) => {
    setLoading(kind);
    try {
      const CSVData = await fetchCSV();
      // A blank body is not a file. The aggregator answers 200 with exactly
      // "\n" when a form has no results, and `=== undefined` never caught it —
      // so the coordinator got a correctly-named, completely empty CSV and was
      // told nothing, which reads as "my data disappeared".
      //
      // A header-only CSV is NOT blank: zero rows is a real answer, and the
      // aggregator emits those deliberately.
      if (CSVData === undefined || String(CSVData).trim() === '') {
        toast(<Toast text={t('export_empty')} />);
        return;
      }
      const blob = new Blob([CSVData], { type: 'text/csv' });
      const csvUrl = window.URL.createObjectURL(blob);
      openWindow(csvUrl, filename);
    } catch (error) {
      // Distinct from the empty case on purpose. Both used to say "No data",
      // so a coordinator whose export CRASHED went looking for missing records
      // instead of retrying.
      toast(<Toast text={t('export_failed')} isError />);
    } finally {
      setLoading(null);
    }
  };

  const fullRecords = (
    <Button
      isSmall
      isLoading={loading === 'full'}
      text={loading === 'full' ? t('export_loading')
        : t(offersResearch ? 'export_full_records_button' : 'export_button')}
      onClick={() => download('full', fetchCSVData, `${name}-${new Date()}.csv`)}
    />
  );

  if (!offersResearch) return fullRecords;

  return (
    <>
      <Button
        isSmall
        intent="primary"
        isLoading={loading === 'research'}
        text={loading === 'research' ? t('export_loading') : t('export_research_button')}
        onClick={() => download(
          'research',
          () => CustomData.getResearchRecordsByShortCode(shortCode, customFormId),
          // Named apart from the identified file, which is the one that must
          // never be sent outside Puente.
          `${name} - research - ${isoDate()}.csv`,
        )}
      />
      {fullRecords}
    </>
  );
}
