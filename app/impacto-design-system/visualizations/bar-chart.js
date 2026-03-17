import { ResponsiveBar } from '@nivo/bar';

export const BarChart = ({
  data, indexBy, minVal = 1, maxVal,
}) => (
  <ResponsiveBar
    data={data}
    keys={['count_of_unique_values']}
    indexBy={indexBy}
    margin={{
      top: 50,
      right: 130,
      bottom: 200,
      left: 60,
    }}
    padding={0.3}
    valueScale={{
      type: 'linear',
      min: minVal * 1.2,
      max: maxVal * 1.2,
      clamp: true,
    }}
    indexScale={{ type: 'band', round: true }}
    colors={{ scheme: 'nivo' }}
    defs={[
      {
        id: 'dots',
        type: 'patternDots',
        background: 'inherit',
        color: '#38bcb2',  // teal pattern - TODO: use dlite token when chart lib supports CSS vars
        size: 4,
        padding: 1,
        stagger: true,
      },
      {
        id: 'lines',
        type: 'patternLines',
        background: 'inherit',
        color: '#eed312',  // yellow pattern - TODO: use dlite token when chart lib supports CSS vars
        rotation: -45,
        lineWidth: 6,
        spacing: 10,
      },
    ]}
    borderColor={{
      from: 'color',
      modifiers: [['darker', 1.6]],
    }}
    axisTop={null}
    axisRight={null}
    axisBottom={{
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 45,
      // legend: "country",
      legendPosition: 'middle',
      legendOffset: 32,
      truncateTickAt: 0,
    }}
    axisLeft={{
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      // legend: 'food',
      legendPosition: 'middle',
      legendOffset: -40,
      truncateTickAt: 0,
    }}
    labelSkipWidth={12}
    labelSkipHeight={12}
    labelTextColor={{
      from: 'color',
      modifiers: [['darker', 1.6]],
    }}
    legends={[
      {
        dataFrom: 'keys',
        anchor: 'bottom-right',
        direction: 'column',
        justify: false,
        translateX: 120,
        translateY: 0,
        itemsSpacing: 2,
        itemWidth: 100,
        itemHeight: 20,
        itemDirection: 'left-to-right',
        itemOpacity: 0.85,
        symbolSize: 20,
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
    role="application"
    ariaLabel={`Bar Chart for ${indexBy}`}
    barAriaLabel={(e) => `${e.id}: ${e.formattedValue} in country: ${e.indexValue}`}
  />
);
