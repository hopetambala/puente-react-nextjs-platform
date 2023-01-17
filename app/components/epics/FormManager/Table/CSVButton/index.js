import Button from 'app/components/elements/button';
import { useRef, useState } from 'react';
import { CSVLink } from 'react-csv';

import fetchFlaskData from '../../../../../services/flask-api';
import flatten from './_utils';

const CSVButton = React.forwardRef(({
  fetchData, data, loading,
}, ref) => (
  <>
    <Button
      aria-label="data"
      text="Download Data"
      onClick={() => fetchData()}
      intent="primary"
      isLoading={loading}
    />
    <CSVLink
      data={data}
      filename="data.csv"
      className="hidden"
      ref={ref}
      target="_blank"
    />
  </>
));

export default function CSVButtonWrapper({ form }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const csvLink = useRef();

  const { objectId } = form;

  const fetchData = async () => {
    setLoading(true);
    const { records } = await fetchFlaskData(`/records-custom-forms/ids/${objectId}`);
    flatten(records);
    setData(records);
    setTimeout(() => {
      csvLink.current.link.click();
    });
    setLoading(false);
  };

  return <CSVButton fetchData={fetchData} data={data} filename="data" loading={loading} ref={csvLink} />;
}
