import { gql } from '@apollo/client';
import client from 'app/services/apollo-grapql';

const dataQueryer = async (grapqlquery) => {
  const { data } = await client.query({
    query: gql`
      ${grapqlquery}
    `,
  });

  return data;
};

export default dataQueryer;
