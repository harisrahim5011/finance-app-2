import { useContext } from 'react'; // Import the useContext hook from React
import { AuthContext } from '../components/AuthContext'; // Import the AuthContext from its file

/**
 * @function useAuth
 * @description A custom React hook to access authentication context.
 * This hook simplifies the process of consuming the AuthContext,
 * providing the authentication state and functions to components.
 * It also ensures that the hook is used within an AuthProvider.
 * @returns {object} The authentication context object, containing
 * authentication state (e.g., user, isAuthenticated)
 * and related functions (e.g., login, logout).
 * @throws {Error} If the hook is used outside of an AuthProvider,
 * indicating a missing context provider in the component tree.
 */
export const useAuth = () => {
  // Use the useContext hook to get the current value of AuthContext.
  // This value is whatever was passed to the `value` prop of the nearest <AuthContext.Provider>.
  const context = useContext(AuthContext);

  // Check if the context is null or undefined.
  // This typically happens if the useAuth hook is called outside of
  // a component that is wrapped by AuthProvider.
  if (!context) {
    // If the context is not available, throw an error to inform the developer
    // that the AuthProvider is missing in the component tree.
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // If the context is successfully retrieved, return it.
  // This context object will contain the authentication state and functions.
  return context;
};