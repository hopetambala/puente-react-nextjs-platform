import { Parse } from 'parse';
import { BehaviorSubject } from 'rxjs';

import { notificationTypeRestParams, refreshSessionToken } from './helpers';

const userSubject = new BehaviorSubject(process.browser && JSON.parse(localStorage.getItem('user')));

const retrieveSignUpFunction = async (params, type) => {
  await refreshSessionToken();

  return new Promise((resolve, reject) => {
    const signupParams = params;
    const restParamsData = notificationTypeRestParams(type, signupParams);
    if (restParamsData) signupParams.restParams = restParamsData;
    Parse.Cloud.run('signup', signupParams).then((user) => {
    console.log(`User registered successful ${user}`); // eslint-disable-line
      const userJSON = user.toJSON();
      userSubject.next(userJSON);
      localStorage.setItem('user', JSON.stringify(userJSON));
      resolve(user);
    }, (error) => {
      reject(error);
    });
  });
};

const retrieveSignInFunction = async (username, password) => {
  await refreshSessionToken();

  return new Promise((resolve, reject) => {
  // sign in with either phonenumber (username) or email handled with logIn
    Parse.User.logIn(String(username), String(password)).then((user) => {
    console.log(`User logged in successful with username: ${user.get('username')}`); // eslint-disable-line
      const userJSON = user.toJSON();
      userSubject.next(userJSON);
      localStorage.setItem('user', JSON.stringify(userJSON));
      resolve(user);
    }, (error) => {
      console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
      reject(error);
    });
  });
};

const retrieveSignOutFunction = () => new Promise((resolve, reject) => {
  Parse.User.logOut().then((result) => {
    localStorage.removeItem('user');
    userSubject.next(null);
    resolve(result);
  }, (error) => {
    reject(error);
  });
});

const retrieveForgotPasswordFunction = (params) => new Promise((resolve, reject) => {
  Parse.Cloud.run('forgotPassword', params).then((result) => {
    resolve(result);
  }, (error) => {
    reject(error);
  });
});

const retrieveCurrentUserAsyncFunction = () => Parse.User.current();

const retrieveDeleteUserFunction = (params) => {
  Parse.Cloud.run('deleteUser', params).then((result) => result);
};

const retrieveUserByObjectId = async (objectId) => new Promise((resolve, reject) => {
  Parse.Cloud.run('retrieveUserByObjectId', { objectId }).then((user) => {
    resolve(user);
  }, (error) => {
    reject(error);
  });
});

const updateUser = async (objectId, userObject) => new Promise((resolve, reject) => {
  Parse.Cloud.run('updateUser', { objectId, userObject }).then((user) => {
    resolve(user);
  }, (error) => {
    reject(error);
  });
});

const queryUser = async (username) => new Promise((resolve, reject) => {
  Parse.Cloud.run('queryUser', { username }).then((user) => {
    resolve(user);
  }, (error) => {
    reject(error);
  });
});

const parseUser = () => userSubject.asObservable();

const parseUserValue = () => userSubject.value;

export {
  parseUser,
  parseUserValue,
  queryUser,
  retrieveCurrentUserAsyncFunction,
  retrieveDeleteUserFunction,
  retrieveForgotPasswordFunction,
  retrieveSignInFunction, retrieveSignOutFunction,
  retrieveSignUpFunction,
  retrieveUserByObjectId,
  updateUser,
};
