import { Parse } from 'parse';
import { BehaviorSubject } from 'rxjs';

import notificationTypeRestParams from './_signupHelper';

const userSubject = new BehaviorSubject(process.browser && JSON.parse(localStorage.getItem('user')));

const retrieveSignUpFunction = (params, type) => new Promise((resolve, reject) => {
  const signupParams = params;
  const restParamsData = notificationTypeRestParams(type, signupParams);
  if (restParamsData) signupParams.restParams = restParamsData;
  Parse.Cloud.run('signup', signupParams).then((user) => {
    console.log(`User registered successful ${user}`); // eslint-disable-line
    userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
    resolve(user);
  }, (error) => {
    reject(error);
  });
});

const retrieveSignInFunction = (username, password) => new Promise((resolve, reject) => {
  // sign in with either phonenumber (username) or email handled with logIn
  Parse.User.logIn(String(username), String(password)).then((user) => {
    console.log(`User logged in successful with username: ${user.get('username')}`); // eslint-disable-line
    userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
    resolve(user);
  }, (error) => {
      console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
    reject(error);
  });
});

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

const retrieveCurrentUserAsyncFunction = () => Parse.User.current().then((u) => {
  const user = {};
  user.id = u.id;
  user.username = u.get('username');
  user.firstname = u.get('firstname');
  user.lastname = u.get('lastname');
  user.email = u.get('email');
  user.organization = u.get('organization');
  user.role = u.get('role');
  return user;
});

const retrieveDeleteUserFunction = (params) => {
  Parse.Cloud.run('deleteUser', params).then((result) => result);
};

const parseUser = () => userSubject.asObservable();

const parseUserValue = () => userSubject.value;

export {
  parseUser,
  parseUserValue,
  retrieveCurrentUserAsyncFunction,
  retrieveDeleteUserFunction,
  retrieveForgotPasswordFunction,
  retrieveSignInFunction, retrieveSignOutFunction,
  retrieveSignUpFunction,
};
