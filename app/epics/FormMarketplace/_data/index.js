import { customMultiParamQueryService } from 'app/modules/cloud-code';
// import _ from 'underscore';

const retrieveAllFormSpecs = async (parseParams) => {
  try {
    const records = await customMultiParamQueryService(5000, 'FormSpecificationsV2', parseParams);
    const parsedRecords = JSON.parse(JSON.stringify(records));
    return parsedRecords;
  } catch (e) {
    return e;
  }
};

export default retrieveAllFormSpecs;
