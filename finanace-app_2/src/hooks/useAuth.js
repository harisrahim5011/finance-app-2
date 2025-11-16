import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext';

/**
 * @typedef {Object} AuthContextShape
 * @property {import('firebase/auth').User|null} user - Currently authenticated user object or null when not signed in.
 * @property {boolean} isAuthenticated - True when a user is authenticated.
 * @property {() => Promise<void>} login - Function to trigger login (implementation provided by AuthProvider).
 * @property {() => Promise<void>} logout - Function to sign the user out.
 * @property {boolean} loading - True while auth state is initializing/loading.
 */

/**
 * useAuth
 * --------
 * A small convenience hook to access authentication state and helpers
 * from the `AuthContext` provider. This keeps components concise and
 * centralizes the check that the hook is used inside an `AuthProvider`.
 *
 * Contract (inputs/outputs):
 * - Inputs: none (reads context)
 * - Output: an object conforming to AuthContextShape
 * - Error modes: throws if there is no provider above in the tree
 *
 * Example usage:
 * const { user, isAuthenticated, login, logout, loading } = useAuth();
 *
 * Notes:
 * - This hook must be called from React function components or other
 *   hooks (not from class components or outside React render flow).
 * - In Server-Side Rendering (SSR) environments, AuthProvider may be
 *   unavailable during build time; protect usage accordingly.
 *
 * @returns {AuthContextShape} The authentication context value.
 * @throws {Error} If called outside of an AuthProvider (missing context).
 */
export const useAuth = () => {
  // Grab the nearest AuthContext value. The value is set by
  // <AuthContext.Provider value={...} /> inside the AuthProvider component.
  const context = useContext(AuthContext);

  // Defensive developer ergonomics: fail fast with an explicit error
  // when the hook consumer forgot to wrap the component tree with
  // the corresponding context provider. This is much easier to debug
  // than silent `undefined` errors later in render.
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Return the context unchanged. Consumers receive the shape described above.
  return context;
};