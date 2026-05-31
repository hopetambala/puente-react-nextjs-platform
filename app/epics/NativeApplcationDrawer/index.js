import { Button } from 'app/impacto-design-system';

import styles from './index.module.css';
import NativeApp from './NativeApp';

const NativeApplicationDrawer = ({ formItems, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="native-drawer"
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
    >
      <div className={styles.drawerHeader}>
        <Button onClick={onClose}>Close</Button>
      </div>
      <div className={styles.drawerBody}>
        <NativeApp formItems={formItems} />
      </div>
    </div>
  );
};

export default NativeApplicationDrawer;
