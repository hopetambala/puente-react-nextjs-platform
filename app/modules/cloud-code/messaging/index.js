import { Parse } from 'parse';

import notificationTypeRestParams from './_messagingHelper';

const sendMessage = (user, notificationType) => {
  const restParamsData = notificationTypeRestParams(notificationType, user);
  return new Promise((resolve, reject) => {
    Parse.Cloud.run('sendMessage', { user, restParamsData }).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
};

export default sendMessage;
