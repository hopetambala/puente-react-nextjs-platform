import { createContext, useContext, useState } from 'react';

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

  const contextProps = {
    globalStore,
    contextManagment: {
      addPropToStore,
      removePropFromStore,
      store: globalStore,
    },
  };

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
