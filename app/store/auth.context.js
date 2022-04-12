import { deleteData, storeData } from 'app/modules/async-storage';
import {
  parseUserValue,
  retrieveSignInFunction,
  retrieveSignOutFunction,
  retrieveSignUpFunction,
} from 'app/modules/user';
import React, { createContext, useEffect, useState } from 'react';

export const UserContext = createContext();

export const UserContextProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    const currentParseUser = parseUserValue();
    if (currentParseUser) {
      setUser(currentParseUser);
      storeData(currentParseUser, 'currentUser');
      setIsLoading(false);
    }
  }, []);

  const login = async (enteredCredentials) => {
    const { username, password } = enteredCredentials;
    setIsLoading(true);
    return retrieveSignInFunction(username, password)
      .then((currentParseUser) => {
        const usr = currentParseUser;
        usr.isOnline = true;
        setUser(usr);
        storeData(usr, 'currentUser');
        storeData(password, 'password');
        setError(null);
        setIsLoading(false);
        return true;
      })
      .catch(async (e) => {
        setError(e.toString());
        setIsLoading(false);
        return false;
      });
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
