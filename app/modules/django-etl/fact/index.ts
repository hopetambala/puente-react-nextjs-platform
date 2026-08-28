const MODEL = "fact";

 const list = () =>
  fetch(`${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${MODEL}/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());


type Parameter = {
    parameters: {
        sort_by: string;
        order: "asc" | "desc";
        filter_criteria: {
            question_answer: string;
        };
    };
};
  
// snake_case because it names the Django ETL service's own route
// (`fact/list_filter_sort/`) and is re-exported as that key on `fact`.
// Renaming it would desync the client from the Python service's URL and break
// the call site in app/epics/DataAnalyticsManager.
// eslint-disable-next-line camelcase
 const list_filter_sort = (body : Parameter) => 
  fetch(
    `${process.env.NEXT_PUBLIC_PUENTE_REST_ETL_URL}${MODEL}/list_filter_sort/`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  ).then((resp) => resp.json());



// eslint-disable-next-line camelcase -- see the note on list_filter_sort above
export const fact = { list, list_filter_sort };