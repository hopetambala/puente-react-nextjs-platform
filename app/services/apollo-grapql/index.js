import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://graphql-api-layer-env.eba-sxufvdbk.us-east-1.elasticbeanstalk.com/',
  cache: new InMemoryCache(),
});

export default client;
