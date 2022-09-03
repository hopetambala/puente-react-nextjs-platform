import { Card } from 'app/components/molecules';
import React, { useEffect, useState } from 'react';

import retrieveAllFormSpecs from './_data';
import styles from './index.module.scss';

const FormMarketplace = ({ context, router }) => {
  const [formSpecs, setFormSpecs] = useState([]);

  const refreshMarketplace = () => retrieveAllFormSpecs({
    typeOfForm: 'Marketplace',
  }).then((records) => {
    setFormSpecs(records);
  });

  useEffect(() => {
    refreshMarketplace();
  }, []);

  const passDataToFormCreator = (action, data) => {
    const href = '/forms/form-creator';

    const storedData = {
      action,
      data,
    };

    context.addPropToStore(href, storedData); // contextManagement.removeFromGlobalStoreData(key);
    router.push(href);
  };

  return (
    <div className={styles.formMarketplace}>
      <h1>Form Marketplace</h1>
      <h2>Most Popular Forms</h2>
      {/* <div className={styles.carousel}>
        <div className={styles.box}>
          {formSpecs.map((form) => (
            <Card
              key={form.objectId}
              title={form.name}
              description={form.description}
              actions={[{ text: 'Duplicate', action: () => passDataToFormCreator(form) }]}
            />
          ))}
        </div>
      </div>
      <div className={styles.searchbar}>
        <SearchBar />
      </div> */}
      <div className={styles.cards}>
        {formSpecs.map((form) => (
          <Card
            key={form.objectId}
            title={form.name}
            description={form.description}
            actions={[{ text: 'Duplicate', action: () => passDataToFormCreator('duplicate', form) }]}
          />
        ))}
      </div>
    </div>
  );
};

export default FormMarketplace;
