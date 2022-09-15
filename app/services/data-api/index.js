const fetchData = (method, path, payload) =>
  fetch(`${process.env.NEXT_PULIC_PUENTE_DATA_EXPORTER_API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then((resp) => resp.json());
export { fetchData };
