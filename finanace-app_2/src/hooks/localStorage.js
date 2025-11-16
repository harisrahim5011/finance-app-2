import { useState, useEffect } from 'react';

/**
 * useLocalStorage (custom React hook)
 *
 * Contract / small "API":
 * - Inputs:
 *   - key: string (localStorage key to persist under)
 *   - initialValue: any (value to use when no stored value exists)
 * - Output: [value, setValue]
 *   - value: current value (kept in React state and localStorage)
 *   - setValue: React-style setter that updates both state and localStorage
 *
 * Behavior / guarantees:
 * - Synchronously reads existing value from localStorage during initialization.
 * - Returns `initialValue` when the key is missing or on JSON parse errors.
 * - Writes JSON-stringified value to localStorage whenever `value` changes.
 * - Catches and logs errors but does not throw (safe for UI usage).
 *
 * Edge cases / notes:
 * - localStorage is not available (e.g., server-side rendering): this hook assumes
 *   it runs in a browser environment. If SSR is used, guard this hook or call
 *   only inside useEffect or client-only code paths.
 * - Values are JSON-serialized. Storing functions, Symbols or non-serializable
 *   circular structures will fail to persist correctly.
 * - JSON.parse may throw for invalid data; the hook catches the error and falls
 *   back to `initialValue` to keep the app stable.
 * - Errors during setItem (e.g., quota exceeded, private mode) are caught and
 *   logged; the in-memory React state will still update and remain usable.
 *
 * Usage Examples:
 * ```js
 * // simple usage
 * const [theme, setTheme] = useLocalStorage('ui_theme', 'light');
 *
 * // complex object
 * const [prefs, setPrefs] = useLocalStorage('user_prefs', { language: 'en' });
 *
 * // persist an array
 * const [ids, setIds] = useLocalStorage('selected_ids', []);
 * ```
 *
 * @param {string} key - localStorage key
 * @param {*} initialValue - initial value when key not found or parse fails
 * @returns {[any, Function]} tuple of [storedValue, setStoredValue]
 */
function useLocalStorage(key, initialValue) {
  // Initialize React state from localStorage; this runs once during mount.
  // We wrap in a lazy initializer so reading localStorage only happens on first render.
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Attempt to read the value from localStorage
      const item = window.localStorage.getItem(key);
      // If present, parse JSON; otherwise use the provided initial value
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Fail-safe: log and return initialValue so app remains functional
      // Common causes: invalid JSON, access denied to localStorage
      // (e.g., browser privacy settings / restricted iframe)
  // We deliberately do NOT rethrow to avoid breaking the app UI.
  console.error(`useLocalStorage: Error retrieving key "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  // Keep localStorage in sync with React state. Any time `storedValue` or `key`
  // changes, serialize the value and persist it. This effect is intentionally
  // simple and defensive: errors are caught and logged but do not interrupt UI.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      // Possible reasons: storage quota exceeded, running in sandboxed iframe, or
  // other browser storage restrictions. We log for debugging and continue.
  console.error(`useLocalStorage: Error setting key "${key}" in localStorage:`, error);
    }
  }, [key, storedValue]);

  // Return the value and a setter. The consumer may call setStoredValue with
  // either a new value or an updater function (functional setState) as typical
  // with React useState.
  return [storedValue, setStoredValue];
}

export default useLocalStorage;