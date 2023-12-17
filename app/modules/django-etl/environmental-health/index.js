const get = (path) =>
  fetch(`${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());

const retrieve = (path, body) =>
  fetch(`${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${path}`, {
    method: "POST",
    body,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());

export { get, retrieve };
