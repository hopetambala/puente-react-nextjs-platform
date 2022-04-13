import { Parse } from 'parse';
// import { BehaviorSubject } from 'rxjs';

// const userSubject = new BehaviorSubject(process.browser && JSON.parse(localStorage.getItem('currentUser')));

const retrieveSignUpFunction = (params) => new Promise((resolve, reject) => {
  Parse.Cloud.run('signup', params).then((user) => {
    console.log('signup', user);
    console.log(`User registered successful ${user}`); // eslint-disable-line
    // userSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    resolve(user);
  }, (error) => {
    reject(error);
  });
});

const retrieveSignInFunction = (params) => new Promise((resolve, reject) => {
  // sign in with either phonenumber (username) or email handled with logIn
  Parse.User.logIn(String(params?.username), String(params?.password)).then((user) => {
  // Parse.Cloud.run('signin', params).then((user) => {
    console.log('signin', user);
    console.log(`User logged in successful with username: ${user.get('username')}`); // eslint-disable-line
    // userSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    resolve(user);
  }, (error) => {
      console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
    reject(error);
  });
});

const retrieveSignOutFunction = () => new Promise((resolve, reject) => {
  Parse.User.logOut().then((result) => {
    localStorage.removeItem('currentUser');
    // userSubject.next(null);
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

/**
 * DEPRECATED
 * @returns
 */
const retrieveCurrentUserAsyncFunction = () => Parse.User.currentAsync();

const retrieveDeleteUserFunction = (params) => {
  Parse.Cloud.run('deleteUser', params).then((result) => result);
};

// const parseUser = () => userSubject.asObservable();

// const parseUserValue = () => userSubject.value;

export {
  // parseUser,
  // parseUserValue,
  retrieveCurrentUserAsyncFunction,
  retrieveDeleteUserFunction,
  retrieveForgotPasswordFunction,
  retrieveSignInFunction, retrieveSignOutFunction,
  retrieveSignUpFunction,
};
