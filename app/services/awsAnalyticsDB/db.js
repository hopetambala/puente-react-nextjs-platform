const Sequelize = require('sequelize');

const {
  NEXT_PUBLIC_ANALYTICS_DB,
  NEXT_PUBLIC_ANALYTICS_DB_USERNAME,
  NEXT_PUBLIC_ANALYTICS_DB_PASSWORD,
  NEXT_PUBLIC_ANALYTICS_DB_HOST,
} = process.env;

const sqlize = () => {
  const sequelize = new Sequelize(
    NEXT_PUBLIC_ANALYTICS_DB,
    NEXT_PUBLIC_ANALYTICS_DB_USERNAME,
    NEXT_PUBLIC_ANALYTICS_DB_PASSWORD,
    {
      host: NEXT_PUBLIC_ANALYTICS_DB_HOST,
      dialect: 'postgres',
    },
  );

  sequelize
    .authenticate()
    .then(() => {
      console.log('Connection has been established successfully.'); //eslint-disable-line
    })
    .catch((error) => {
      console.error("Unable to connect to the database: ", error); //eslint-disable-line
    });

  return sequelize;
};

export default sqlize;
