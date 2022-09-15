import { customQueryService } from 'app/modules/cloud-code';
import _ from 'underscore';

const retrieveCustomData = async (organization) => {
  try {
    const records = await customQueryService(
      0,
      5000,
      'FormSpecificationsV2',
      'organizations',
      organization
    );
    const parsedRecords = JSON.parse(JSON.stringify(records));
    return parsedRecords;
  } catch (e) {
    return e;
  }
};

const retrieveUniqueListOfOrganizations = async () => {
  try {
    const records = await customQueryService(
      0,
      500,
      'User',
      'adminVerified',
      true
    );
    const parsedRecords = JSON.parse(JSON.stringify(records));
    const uniqueRecords = _.uniq(parsedRecords, (x) => x.organization);
    const pluckedRecords = _.pluck(uniqueRecords, 'organization');
    return pluckedRecords;
  } catch (e) {
    return e;
  }
};

const retrievePuenteFormModifications = async (organization) => {
  try {
    const records = await customQueryService(
      0,
      5000,
      'PuenteFormModifications',
      'organizations',
      organization
    );
    const parsedRecords = JSON.parse(JSON.stringify(records));
    return parsedRecords;
  } catch (e) {
    return e;
  }
};

export {
  retrieveCustomData,
  retrievePuenteFormModifications,
  retrieveUniqueListOfOrganizations,
};
