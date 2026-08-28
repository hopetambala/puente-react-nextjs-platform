import { CardAlt, EmptyState, Spinner } from 'app/impacto-design-system';
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

  // Three mutually exclusive states — loading, empty, populated — as early
  // returns rather than ternaries nested inside the JSX.
  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <Spinner />
        </div>
      );
    }
    if (formSpecs.length === 0) {
      return <EmptyState message="No forms available yet." />;
    }
    return (
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
    );
  };

  return (
    <div className={styles.formMarketplace}>
      {renderContent()}
    </div>
  );
};

export default FormMarketplace;
