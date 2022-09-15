import { Button } from '@material-ui/core';
import {
  GroupedBarChart,
  LineChart,
  ResponsiveScatterPlot,
} from 'app/components/charts';
import Page from 'app/components/templates/dashboard-layout';
import dataQueryer from 'app/modules/apollo-grapql';
import { useState } from 'react';

const organization = 'WOF';

const SChart = ({ data }) => {
  const legend = { left: 'Systolic', bottom: 'Diastolic' };

  const mappedVitals = [
    {
      id: organization,
      data: data.reduce((result, record) => {
        if (
          Number(record.Diastolic) < 300 &&
          Number(record.Systolic) < 300 &&
          Number(record.Diastolic) > 0 &&
          Number(record.Systolic) > 0
        ) {
          return result.concat({
            communityname: record.communityname,
            city: record.city,
            educationLevel: record.educationLevel,
            x: Number(record.Diastolic),
            y: Number(record.Systolic),
          });
        }
        return result;
      }, []),
    },
  ];

  return (
    <div style={{ height: '400px' }}>
      <ResponsiveScatterPlot data={mappedVitals} legend={legend} />
    </div>
  );
};

const LChart = ({ data }) => {
  const legend = { left: 'Systolic', bottom: 'Diastolic' };

  const countedData = [];
  const groupBy = (keys) => (array) =>
    array.reduce((objectsByKeyValue, obj) => {
      const modifiedObjs = objectsByKeyValue;
      const value = keys.map((key) => obj[key]).join('-');
      modifiedObjs[value] = (modifiedObjs[value] || []).concat(obj);
      return modifiedObjs;
    }, {});

  const groupByCommunityName = groupBy(['communityname']);

  for (const [groupName, values] of Object.entries(
    groupByCommunityName(data)
  )) {
    //eslint-disable-line
    // console.log(`${groupName}: ${values.length}`);
    countedData.push({
      x: groupName,
      y: values.length,
    });
  }

  const mappedVitals = [
    {
      id: organization,
      data: countedData,
    },
  ];

  // console.log(mappedVitals)

  return (
    <div style={{ height: '400px' }}>
      <LineChart data={mappedVitals} legend={legend} />
      <h1>hello</h1>
    </div>
  );
};

const BChart = ({ data }) => {
  const legend = { left: 'Blood Pressure', middle: 'Community' };

  const parsedData = data.map((result) => ({
    ...result,
    Diastolic: Number(result.Diastolic),
    Systolic: Number(result.Systolic),
  }));

  const reduced = parsedData.reduce((paramM, paramD) => {
    const m = paramM;
    const d = paramD;
    if (!m[d.communityname]) {
      m[d.communityname] = { ...d, count: 1 };
      return m;
    }
    m[d.communityname].Systolic += d.Systolic;
    m[d.communityname].Diastolic += d.Diastolic;
    m[d.communityname].count += 1;
    return m;
  }, {});

  const result = Object.keys(reduced).map((k) => {
    const item = reduced[k];
    return {
      communityname: item.communityname,
      Systolic: Math.round(item.Systolic / item.count),
      Diastolic: Math.round(item.Diastolic / item.count),
      Count: item.count,
    };
  });

  return (
    <div style={{ height: '500px' }}>
      <GroupedBarChart
        data={result}
        keys={['Systolic', 'Diastolic']}
        indexBy="communityname"
        legend={legend}
      />
    </div>
  );
};

const Forms = ({ vitals }) => {
  const [recordNumber, setRecordNumber] = useState(250);

  return (
    <Page header footer>
      <main className="container">
        <div>Data Viz</div>
        <h1>{organization}</h1>
        <div className="buttons around">
          <Button variant="contained" onClick={() => setRecordNumber(250)}>
            250 Records
          </Button>
          <Button variant="contained" onClick={() => setRecordNumber(500)}>
            500 Records
          </Button>
          <Button variant="contained" onClick={() => setRecordNumber(1000)}>
            1000 Records
          </Button>
          <Button variant="contained" onClick={() => setRecordNumber(2000)}>
            2000 Records
          </Button>
        </div>

        <SChart data={vitals.getVitalByOrganization.slice(0, recordNumber)} />
        <BChart data={vitals.getVitalByOrganization.slice(0, recordNumber)} />
        <LChart data={vitals.getVitalByOrganization.slice(0, recordNumber)} />

        <style jsx>
          {`
            .buttons {
              display: flex;
              width: 75vh;
            }
            .buttons.around {
              justify-content: space-around;
            }
          `}
        </style>
      </main>
    </Page>
  );
};

export async function getStaticProps() {
  const vitals = await dataQueryer(`
    query{
      getVitalByOrganization(organization: "${organization}"){
          sex
          dob
          age
          educationLevel
          communityname
          city 
          province 
          region
          surveyingUser
          surveyingOrganization
          surveyingUserSupplementary
          height
          weight
          respRate
          bmi
          bloodSugar
          bloodOxygen
          bloodPressure
          Systolic
          Diastolic
          pulse
          hemoglobinLevels
          createdAt
          updatedAt
      }
    }`);

  return {
    props: {
      vitals,
    },
  };
}

export default Forms;
