const MODEL = 'environmentalhealthbronze';

const get = (path) =>
  fetch(`${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${MODEL}/${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());

const get_count = (body) => fetch(`${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${MODEL}/get_count/`, {
  method: 'POST',
  body: JSON.stringify(body),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}).then((resp) => resp.json());

export const environmentalHealthBronze = { get, get_count };
