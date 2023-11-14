import Card from './Card';

const FormManagerGrid = ({
  data,
  retrieveCustomData, passDataToFormCreator,
  organization, workflows,
}) => (
  <div>
    {data !== undefined && data.length > 0 ? (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 4,
        marginTop: '3rem',

      }}
      >
        {data.map((row) => (
          <Card
            title={row.name}
            description={row.description}
            row={row}
            retrieveCustomData={retrieveCustomData}
            passDataToFormCreator={passDataToFormCreator}
            organization={organization}
            workflows={workflows}
          />
        ))}
      </div>
    ) : (
      <h3>No Data Available</h3>
    )}
  </div>
);

export default FormManagerGrid;
