import { useState, useEffect } from 'react';

/**
 * A custom React hook that persists state to localStorage
 * @param {string} key - The localStorage key to use
 * @param {*} initialValue - The initial value if no stored value exists
 * @returns {[*, Function]} - A tuple containing the stored value and a setter function
 */
function useLocalStorage(key, initialValue) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error retrieving key "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  // Persist to localStorage whenever the state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting key "${key}" in localStorage:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;