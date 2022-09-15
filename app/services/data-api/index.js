const fetchData = (method, path) =>
  fetch(`${process.env.NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }).then((resp) => resp.json());
export { fetchData };
