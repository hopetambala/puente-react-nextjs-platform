import { Parse } from 'parse';

// Every export is identified patient data, so the export service checks who is
// asking (puente-flask-rest-aggregator api/auth.py). The signed-in session is
// the proof; with nobody signed in, no header is sent at all.
const sessionHeader = () => {
  const token = Parse.User.current()?.getSessionToken();
  return token ? { 'X-Parse-Session-Token': token } : {};
};

const fetchData = async (path) => fetch(`${process.env.NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL}${path}`, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'text/csv',
    ...sessionHeader(),
  },
}).then(async (resp) => {
  if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
  return resp.text();
});

export default fetchData;
