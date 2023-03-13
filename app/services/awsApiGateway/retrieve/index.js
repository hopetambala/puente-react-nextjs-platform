import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 *
 * @param {Object} parameters
 * @returns concatenated key,value pairs
 */
function concatParameters(parameters) {
  let path = '?';

  Object.keys(parameters).forEach((key) => {
    const keyValue = `${key}=${parameters[key]}&`;
    path = path.concat(keyValue);
  });

  return path;
}

/**
 *
 * @param {string} parameters
 * @returns returns Object with s3 Url
 */
async function retrieveS3CSVUrl(parameters) {
  const path = concatParameters(parameters);
  const url = `${process.env.NEXT_PUBLIC_AWS_DATA_CSV_S3_URL}${path}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((resp) => resp.json())
    .catch((e) => console.log("retrieveS3CSVUrl:", e)); //eslint-disable-line
}

async function retrieveS3Data(Bucket, Key) {
  const s3 = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_awsAccessKeyId,
      secretAccessKey: process.env.NEXT_PUBLIC_awsSecretAccessKey,
    },
  });

  const command = new GetObjectCommand({
    Bucket,
    Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 15 * 60 });
}
async function downloadCSV(s3Url) {
  const Bucket = process.env.NEXT_PUBLIC_s3Bucket;
  const Key = s3Url.split(`s3://${Bucket}/`)[1];
  return retrieveS3Data(Bucket, Key);
}

export { downloadCSV, retrieveS3CSVUrl };
