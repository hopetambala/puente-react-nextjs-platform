import { Page } from "app/impacto-design-system";
import { BarChart } from "app/impacto-design-system/visualizations";
import { useEffect, useState } from "react";
import { environmentalHealthRecord } from "../../../app/modules/django-etl";

const filters = {
  "Clinic Access": "clinicaccess_v2",
  "Biggest Problem": "biggestproblemofcommunity_v2",
  "Floor Material": "floormaterial",
  "Years in Community": "yearslivedinthecommunity",
  "Type of water you drink": "typeofwaterdoyoudrink",
};
const Forms = () => {
  const [data, setData] = useState([]);
  const [key, setKey] = useState();

  useEffect(() => {
    const fetchData = async () => {
      if (!key) return;
      const data = await environmentalHealthRecord.retrieve(
        "environmentalhealthbronze/get_count/",
        JSON.stringify({ fields: [key] })
      );

      setData(
        data.filter((obj) =>
          Object.values(obj).every((value) => value !== null)
        )
      );
    };
    fetchData().catch(console.error);
  }, [key]);

  return (
    <Page header footer>
      <main className="container">
        <h1>Data Viz</h1>
        <div>
          {Object.keys(filters).map((filter) => (
            <button onClick={() => setKey(filters[filter])}>{filter}</button>
          ))}
        </div>
        <div style={{ height: "60vh", width: "100%" }}>
          {data.length > 0 && <BarChart data={data} indexBy={key} />}
        </div>
      </main>
    </Page>
  );
};

export default Forms;
