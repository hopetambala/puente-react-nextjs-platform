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



export const fact = { list, list_filter_sort };