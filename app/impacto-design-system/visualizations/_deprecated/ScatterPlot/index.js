/* eslint-disable */

import { ResponsiveScatterPlot } from '@nivo/scatterplot';

const ScatterPlot = (
  {
    data,
    legend,
  },
) => (
  <ResponsiveScatterPlot
    data={data}
    margin={{
      top: 60, right: 140, bottom: 100, left: 90,
    }}
    xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
    yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
    // CUSTOM PROP
    colors={(node) => (node.y < 120 && node.x < 80 ? '#A5BC39'
      : node.y < 129 && node.x < 80 ? '#FFDA46'
        : node.y < 139 || node.x < 89 ? '#F99F2C'
          : node.y > 140 || node.x > 90 ? '#ff0000' : 'black')}
     // CUSTOM PROP
    tooltip={({ node }) => (
      <div
        style={{
          color: node.style.color,
          background: '#333',
          padding: '12px 16px',
        }}
      >
        <strong>
          {node.data.communityname}
          {' '}
          (
          {node.data.city}
          )
        </strong>
        <br />
        {`Systolic: ${node.data.formattedX}`}
        <br />
        {`Diastolic: ${node.data.formattedY}`}
      </div>
    )}
    blendMode="multiply"
    axisTop={null}
    axisRight={null}
    axisBottom={{
      orient: 'bottom',
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: legend.bottom,
      legendPosition: 'middle',
      legendOffset: 75,
    }}
    axisLeft={{
      orient: 'left',
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: legend.left,
      legendPosition: 'middle',
      legendOffset: -60,
    }}
    legends={[
      {
        anchor: 'bottom-right',
        direction: 'column',
        justify: false,
        translateX: 130,
        translateY: 0,
        itemWidth: 100,
        itemHeight: 12,
        itemsSpacing: 5,
        itemDirection: 'left-to-right',
        symbolSize: 12,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemOpacity: 1,
            },
          },
        ],
      },
    ]}
  />
);

export default ScatterPlot;
