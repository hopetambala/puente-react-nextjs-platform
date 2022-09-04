const fetchData = (path, payload) => fetch(`${process.env.NEXT_PUBLIC_PUENTE_SMS_EMAIL_API_URL}${path}`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
}).then((resp) => resp.json());

export default fetchData;
