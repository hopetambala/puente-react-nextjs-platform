import Button from 'app/impacto-design-system/button';
import Toast from 'app/impacto-design-system/toast';
import offersResearchExport from 'app/modules/data-export/offersResearchExport';
import {
    CustomData, EnvironmentalHealth, EvaluationMedical, SurveyData, Vitals,
} from 'app/modules/data-export/puente';
import { loadOrganizationIdentity } from 'app/modules/organization';
import { useTranslation } from 'next-i18next';
import { Parse } from 'parse';
import { useState } from 'react';
import { toast } from 'react-toastify';

// U+FEFF, written as the bytes EF BB BF: how Excel recognises a UTF-8 CSV.
const UTF8_BOM = '\uFEFF';

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

// The coordinator's own calendar date. toISOString() is UTC, which in the
// Dominican Republic (UTC−4) names an evening's file with tomorrow's date.
const localDate = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function CSVButtonWrapper({ form, surveyingOrganization, shortCode }) {
  const { objectId: customFormId, customForm, name } = form;
  const [loading, setLoading] = useState(null);
  const { t } = useTranslation('common');

  const offersResearch = offersResearchExport(form, shortCode);

  const fetchCSVData = async () => {
    // A pending or failed lookup can leave shortCode unset. Verify the scope
    // before using the legacy path, which only serves a single organization name.
    const code = shortCode || (await loadOrganizationIdentity(
      Parse, surveyingOrganization, { strict: true },
    )).shortCode;
    if (customForm) {
      return code
        ? CustomData.getSpecificRecordsByShortCode(code, customFormId)
        : CustomData.getSpecificRecordsByOrganization(surveyingOrganization, customFormId);
    }
    /**
     * This is a workaround for the SurveyData class, which has a different endpoint (v3)
     */
    if (name === 'SurveyData') {
      return code
        ? SurveyData.getIdRecordByShortCode(code)
        : SurveyData.getIdRecordByOrganization(surveyingOrganization);
    }
    return code
      ? puenteMap[name].getRecordByShortCode(code)
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
      // The UTF-8 byte-order mark first: Windows Excel reads a CSV without it
      // as Windows-1252, so "jiménez" opens as "jimÃ©nez". Coordinators open
      // these files by double-click in Excel; their August spreadsheets had
      // hundreds of garbled names and not one correct accent.
      const blob = new Blob([UTF8_BOM, CSVData], { type: 'text/csv;charset=utf-8' });
      const csvUrl = window.URL.createObjectURL(blob);
      openWindow(csvUrl, filename);
    } catch (error) {
      // Distinct from the empty case on purpose. Both used to say "No data",
      // so a coordinator whose export CRASHED went looking for missing records
      // instead of retrying.
      // A 401 is a session that expired or was revoked: retrying can't help,
      // signing in again does.
      toast(<Toast text={t(error && error.status === 401 ? 'export_signed_out' : 'export_failed')} isError />);
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
          `${name} - research - ${localDate()}.csv`,
        )}
      />
      {fullRecords}
    </>
  );
}
