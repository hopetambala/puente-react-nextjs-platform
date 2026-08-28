import { Parse } from 'parse';

/**
  * Performs a query based on the parameter defined in a column
  *
  * @example
  * customMultiParamQueryService(1000,SurveyData,{
        typeOfForm: 'Custom',
        organizations: surveyingOrganization
    })
  *
  * @param {number} limit Max limit of results
  * @param {string} parseModel Name of Backend Model
  * @param {object} parseParams object of key-value pairs of params
  * @returns Results of Query
  */
function customMultiParamQueryService(limit, parseModel, parseParams) {
  // The 5000 default is applied in the body rather than in the signature.
  // `limit` is the first of three positional params, so a default there trips
  // default-param-last, and moving it after parseParams would break the
  // existing positional call sites. `=== undefined` reproduces default-param
  // semantics exactly (an explicit null still passes through, as before).
  const resolvedLimit = limit === undefined ? 5000 : limit;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const Model = Parse.Object.extend(parseModel);

      const query = new Parse.Query(Model);

      query.limit(resolvedLimit);

      query.descending('createdAt');

      Object.entries(parseParams).forEach((e) => query.equalTo(e[0], e[1]));

      query.find().then((records) => {
        resolve(records);
      }, (error) => {
        reject(error);
      });
    }, 1500);
  });
}

/**
  * Performs a query based on the parameter defined in a column
  *
  * @example
  * customQueryService(0,1000,SurveyData,organization,Puente)
  *
  * @param {number} offset First number
  * @param {number} limit Max limit of results
  * @param {string} parseModel Name of Backend Model
  * @param {string} parseColumn Name of Column in Backend Model
  * @param {string} parseParam Name of Parameter in Column
  * @returns Results of Query
  */
function customQueryService(offset, limit, parseModel, parseColumn, parseParam) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const Model = Parse.Object.extend(parseModel);

      const query = new Parse.Query(Model);

      query.skip(offset);

      query.limit(limit || 5000);

      query.descending('createdAt');

      query.equalTo(parseColumn, parseParam);

      query.find().then((records) => {
        resolve(records);
      }, (error) => {
        reject(error);
      });
    }, 1500);
  });
}

function removeQueryService(parseModel, objectId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const Model = Parse.Object.extend(parseModel);

      const query = new Parse.Query(Model);

      query.get(objectId).then((obj) => {
        resolve(obj.destroy());
      }, (error) => {
        reject(error);
      });
    }, 1500);
  });
}

export { customMultiParamQueryService, customQueryService, removeQueryService };
