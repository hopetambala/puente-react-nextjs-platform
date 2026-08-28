import { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext();

export function AppWrapper({ children }) {
  const [globalStore, setGlobalStore] = useState({});

  const addPropToStore = (key, data) => {
    const store = globalStore;
    store[key] = data;
    setGlobalStore(store);
  };

  const removePropFromStore = (key) => {
    const store = globalStore;
    delete store[key];
    setGlobalStore(store);
  };

  // Memoised purely to stop a new context value being constructed on every
  // render. `globalStore` is the only value this object depends on, and both
  // closures below capture nothing else that changes, so [globalStore] is the
  // complete dependency list. This deliberately does not touch how
  // addPropToStore/removePropFromStore update state — that is tracked
  // separately and changing it here would alter behaviour app-wide.
  const contextProps = useMemo(
    () => ({
      globalStore,
      contextManagment: {
        addPropToStore,
        removePropFromStore,
        store: globalStore,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalStore],
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
