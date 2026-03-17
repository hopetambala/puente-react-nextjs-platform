import { CardAlt, Spinner } from 'app/impacto-design-system';
import { useEffect, useState } from 'react';

import retrieveAllFormSpecs from './_data';
import styles from './index.module.scss';

const FormMarketplace = ({ context, router }) => {
  const [formSpecs, setFormSpecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshMarketplace = () => retrieveAllFormSpecs({
    typeOfForm: 'Marketplace',
  }).then((records) => {
    setFormSpecs(records);
    setLoading(false);
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
      {loading ? (
        <div className={styles.loadingState}>
          <Spinner />
        </div>
      ) : formSpecs.length > 0 ? (
        <div className={styles.cards}>
          {formSpecs.map((form) => (
            <CardAlt
              key={form.objectId}
              title={form.name}
              description={form.description}
              actions={[
                {
                  text: 'Duplicate',
                  action: () => passDataToFormCreator('duplicate', form),
                },
              ]}
            />
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>No forms available yet.</p>
      )}
    </div>
  );
};

export default FormMarketplace;
