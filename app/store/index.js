import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppContext = createContext();

export function AppWrapper({ children }) {
  const [globalStore, setGlobalStore] = useState({});

  const addPropToStore = useCallback((key, data) => {
    setGlobalStore((prev) => ({ ...prev, [key]: data }));
  }, []);

  const removePropFromStore = useCallback((key) => {
    setGlobalStore((prev) => {
      // Copy-then-delete rather than rest-destructuring the key out: the
      // omitted-key binding trips @typescript-eslint/no-unused-vars under this
      // config, and trading a fixed suppression for a new one is no trade.
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Memoised purely to stop a new context value being constructed on every
  // render. Both writers build a new store object and go through the functional
  // updater form, so React sees a fresh reference and consumers re-render, and
  // neither closure can capture a stale `globalStore`.
  const contextProps = useMemo(
    () => ({
      globalStore,
      contextManagment: {
        addPropToStore,
        removePropFromStore,
        store: globalStore,
      },
    }),
    [globalStore, addPropToStore, removePropFromStore],
  );

  return (
    <AppContext.Provider value={contextProps}>
      {children}
    </AppContext.Provider>
  );
}

export function useGlobalState() {
  const state = useContext(AppContext);

  if (state === undefined) {
    throw new Error('useGlobalState must be used within a AppContext.Provider');
  }

  return state;
}
