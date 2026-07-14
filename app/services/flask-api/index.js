const fetchData = async (path) => await fetch(`${process.env.NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL}${path}`, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'text/csv',
  },
}).then(async (resp) => {
  if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
  return resp.text();
});

export default fetchData;
