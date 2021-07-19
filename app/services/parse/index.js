import {
  initialize,
  retrieveCurrentUserAsyncFunction,
  retrieveCurrentUserFunction, retrieveDeleteUserFunction,
  retrieveForgotPasswordFunction,
  retrieveSignInFunction, retrieveSignOutFunction,
  retrieveSignUpFunction,
} from './auth';
import countService from './calculate';
import {
  customQueryService,
  getObjectsByGeolocation,
  postObjectsToClass,
  postObjectsToClassWithRelation,
  removeQueryService,
  residentIDQuery,
  retrieveHelloFunction,
  updateObject,
} from './crud';

export {
  countService,
  customQueryService,
  getObjectsByGeolocation,
  initialize,
  postObjectsToClass,
  postObjectsToClassWithRelation,
  removeQueryService,
  residentIDQuery,
  retrieveCurrentUserAsyncFunction,
  retrieveCurrentUserFunction, retrieveDeleteUserFunction,
  retrieveForgotPasswordFunction,
  retrieveHelloFunction,
  retrieveSignInFunction, retrieveSignOutFunction,
  retrieveSignUpFunction,
  updateObject,
};
