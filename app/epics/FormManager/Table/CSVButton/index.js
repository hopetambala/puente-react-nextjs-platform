import Button from 'app/impacto-design-system/button';
import { retrieveS3CSVUrl } from 'app/services/awsApiGateway';
import { downloadCSV } from 'app/services/awsApiGateway/retrieve';
import { useState } from 'react';

function openWindow(dataurl, filename) {
  const link = document.createElement('a');
  link.href = dataurl;
  link.download = filename;
  link.click();
}

export default function CSVButtonWrapper({ form, surveyingOrganization }) {
  const { objectId: customFormId, customForm, name } = form;
  const [loading, setLoading] = useState(false);

  const parameters = {
    specifier: customForm ? 'FormResults' : name,
    surveyingOrganization,
    ...(customFormId && { customFormId }),
  };

  const fetchData = async () => {
    setLoading(true);
    const resp = await retrieveS3CSVUrl(parameters);
    const { s3_url: s3Url } = resp;
    const downloadUrl = await downloadCSV(s3Url);
    openWindow(downloadUrl, `${parameters.specifier}-${customFormId}.csv`);
    setLoading(false);
  };

  return (
    <Button
      intent="primary"
      isLoading={loading}
      text={loading ? 'Loading' : 'Download'}
      onClick={fetchData}
    />
  );
}
