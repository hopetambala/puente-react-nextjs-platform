import { fetchData } from '../../../services/data-api';

const getPersonCustom = async (id) => {
  const data = await fetchData('GET', `records-custom-forms/${id}`);
  return data.records;
};

const getCustomRecords = async () => {
  const data = await fetchData('GET', `/`);
  return data.records;
};

const getCustomByOrganization = async (organization) => {
  const data = await fetchData('GET', `records-custom-forms/organizations/${organization}`);
  return data.records;
};

const getCustomById = async (id) => {
  const data = await fetchData('GET', `records-custom-forms/ids/${id}`);
  return data.records;
};

export {
  getCustomById,
  getCustomByOrganization,
  getCustomRecords,
  getPersonCustom,
};
