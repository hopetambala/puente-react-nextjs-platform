import sequelize from '../../../app/services/awsAnalyticsDB/db';

export default async function handler(req, res) {
  const [communities] = await sequelize().query(
    'SELECT * FROM community_dim',
  );
  const requestMethod = req.method;

  switch (requestMethod) {
    case 'POST': {
      const body = JSON.parse(req.body);
      return res
        .status(200)
        .json({ message: `You submitted the following data: ${body}` });
    }
    default: {
      return res.status(200).json(communities.slice(0, 3));
    }
  }
}
