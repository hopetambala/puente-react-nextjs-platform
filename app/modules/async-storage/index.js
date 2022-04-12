const storeData = async (value, storageName) => {
  try {
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(storageName, jsonValue);
    return;
  } catch (e) {
    // saving error
    console.log(e); //eslint-disable-line

  }
};

const getData = async (storageName) => {
  try {
    const jsonValue = localStorage.getItem(storageName);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.log(e); //eslint-disable-line
    return null;
  }
};

const deleteData = async (storageName) => {
  try {
    localStorage.removeItem(storageName);
  } catch (e) {
    console.log(e); //eslint-disable-line
  }
};

const getAllData = async () => {
  try {
    const keys = await localStorage.getAllKeys();
    const result = await localStorage.multiGet(keys);
    return result;
  } catch (e) {
    console.log(e); //eslint-disable-line
    return null;
  }
};

export {
  deleteData, getAllData,
  getData, storeData,
};
