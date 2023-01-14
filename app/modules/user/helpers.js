import { Parse } from 'parse';

const text = (data) => {
  const { phonenumber } = data;
  return {
    runMessaging: true,
    path: 'text',
    data: {
      textTo: phonenumber,
      type: 'signup',
    },
  };
};

const email = (data) => {
  const {
    objectId, firstname, lastname, emailAddress,
  } = data;
  return {
    runMessaging: true,
    path: 'email',
    data: {
      emailSubject: 'Signing Up for Puente',
      objectId,
      userFullName: `${firstname} ${lastname}`,
      emailAddress,
      type: 'signup',
    },
  };
};

export const notificationTypeRestParams = (type, data) => {
  if (type === 'text') return text(data);
  if (type === 'email') return email(data);
  return null;
};

export const refreshSessionToken = async () => {
  const currentUser = Parse.User.current();
  if (currentUser) {
    return Parse.User.logOut();
  }
  return null;
};
