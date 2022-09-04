import MessagingService from '../../services/messaging-api';

/**
 * Too tightly coupled with just signup and password reset
 */

const sendEmail = (restParamsData, parseObject) => {
  const { emailSubject, type } = restParamsData;
  const { email: emailAddress, objectId, firstname } = parseObject;

  const payload = {
    emailSubject,
    objectId,
    userFullName: firstname,
    emailsToSendTo: [
      emailAddress,
    ],
    type, // signup, passwordReset,default
  };

  return MessagingService('/email', payload);
};

const sendText = (restParamsData, parseObject) => {
  const { type } = restParamsData;
  const { objectId, firstname, phonenumber } = parseObject;

  let textBody = '';

  if (type === 'accountReset') textBody = `Hello ${firstname}! Reset your Puente Account at\nhttps://puente-manage.vercel.app/account/reset?objectId=${objectId}`;

  const payload = {
    textTo: phonenumber,
    textBody,
  };

  return MessagingService('/text', payload);
};

/**
 * Performs a query based on the parameter defined in a column
 *
 * @example
 * sendMessage(
 *  'text',
 *  {
 *   "textTo": "1234567",
 *   "textBody": "Text"
 *  }
 * )
 *
 * @param {string} path which endpoint to hit
 * @param {string} restParamData Data consisting of which
 * @returns Results of Query
 */
const MessagingModule = async (restParams, parseObject) => {
  const {
    path,
    data,
  } = restParams;

  try {
    const response = path === 'email' ? await sendEmail(data, parseObject) : await sendText(data, parseObject);
    return response;
  } catch (e) {
    return e;
  }
};

export default MessagingModule;
