import { deleteData, storeData } from 'app/modules/async-storage';
import {
  // parseUserValue,
  // retrieveCurrentUserAsyncFunction,
  retrieveSignInFunction,
  retrieveSignOutFunction,
  retrieveSignUpFunction,
} from 'app/modules/user';
import React, {
  createContext,
  // useEffect,
  useState,
} from 'react';

export const UserContext = createContext();

export const UserContextProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // useEffect(() => {
  //   setIsLoading(true);
  //   async function checkUser() {
  //     const currentParseUser = await retrieveCurrentUserAsyncFunction();
  //     console.log(currentParseUser);
  //     if (!currentParseUser) {
  //       return;
  //     }
  //     setUser(currentParseUser);
  //     storeData(currentParseUser, 'currentUser');
  //     setIsLoading(false);
  //   }

  //   checkUser();
  // }, []);

  const login = async (enteredCredentials) => {
    setIsLoading(true);
    try {
      const u = await retrieveSignInFunction(enteredCredentials);
      setUser(u);
      storeData(u, 'currentUser');
      setError(null);
      setIsLoading(false);
      return u;
    } catch (e) {
      setError(e.toString());
      setIsLoading(false);
      return null;
    }
  };

  /**
   * @param {*} params
   * @returns User Object
   */

  const register = async (params) => {
    const { password } = params;
    storeData(password, 'password');
    setIsLoading(true);
    try {
      const u = await retrieveSignUpFunction(params);
      setUser(u);
      setError(null);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      setError(e.toString());
    }
  };

  const onLogout = async () => retrieveSignOutFunction()
    .then(() => {
      deleteData('currentUser');
      setError(null);
      return true;
    }).catch((e) => {
      setError(e);
      return false;
    });

  return (
    <UserContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        isLoading,
        error,
        login,
        register,
        onLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
