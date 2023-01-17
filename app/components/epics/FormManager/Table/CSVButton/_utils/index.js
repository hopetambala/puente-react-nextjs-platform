const flatten = (arrayOfRecords) => arrayOfRecords.forEach((element) => {
  const record = element;
  record.fields.forEach((field) => {
    const { title, answer } = field;
    record[title] = answer;
  });
  delete record.fields;
});

export default flatten;
