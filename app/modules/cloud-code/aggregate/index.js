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
  * @param {string} parseModel Name of Backend Model
  * @param {object} parseParams object of key-value pairs of params
  * @returns Results of Query
  */
function customMultiParamCountService(parseModel, parseParams) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const Model = Parse.Object.extend(parseModel);

      const query = new Parse.Query(Model);

      Object.entries(parseParams).forEach((e) => query.equalTo(e[0], e[1]));

      query.count().then((count) => {
        resolve(count);
      }, (error) => {
        reject(error);
      });
    }, 1500);
  });
}

export default customMultiParamCountService;
