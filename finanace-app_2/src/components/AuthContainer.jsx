import React from 'react';
import { useAuth } from '../hooks/useAuth'; // Custom hook for authentication state and functions
import LoadingIndicator from './LoadingIndicator'; // Component to display a loading spinner

/**
 * AuthContainer Component
 *
 * This component is responsible for rendering the authentication interface of the Finance Tracker application.
 * It primarily handles the display of a loading indicator during the initial authentication check
 * (including automatic anonymous sign-in). If no user is authenticated after this check, it provides
 * a button to sign in with Google.
 */
const AuthContainer = () => {
  // Destructure authentication-related state and functions from the useAuth hook.
  // currentUser: The currently authenticated user object (null if not authenticated).
  // signInWithGoogle: Function to initiate the Google sign-in process.
  // loading: A boolean indicating if an authentication operation is in progress.
  const { currentUser, signInWithGoogle, loading, error } = useAuth(); // Also get error for feedback

  // --- Conditional Rendering Logic ---

  // 1. If authentication is still in progress (initial check or sign-in attempt), show loading.
  if (loading) {
    return <LoadingIndicator />;
  }

  // 2. If a user is already authenticated (either Google or anonymous),
  //    this component should not render the sign-in options. The main app will take over.
  //    This typically means the parent component of AuthContainer will conditionally
  //    render AuthContainer OR the main app content based on currentUser.
  //    However, if AuthContainer is ALWAYS rendered and it needs to decide what to show,
  //    then if currentUser exists, it means the user is logged in.
  if (currentUser) {
    // In a typical setup, the parent App component would check currentUser and render
    // either AuthContainer or the main application. If AuthContainer is always present,
    // and a user is found (anonymous or otherwise), we can simply return null or a minimal
    // message, assuming the main app content is already being rendered elsewhere
    // based on `currentUser` being truthy.
    return null; // User is authenticated, no need to show sign-in options.
  }

  // 3. If loading is false AND there's no currentUser, it means:
  //    - The initial anonymous sign-in attempt failed.
  //    - The user explicitly signed out from a Google/anonymous session.
  //    In this case, we offer the Google sign-in option.
  return (
    // Main container for the authentication screen, styled for centering and appearance.
    <div className="text-center bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
      {/* Application title. */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Finance Tracker</h1>
      {/* Introductory text for the sign-in prompt. */}
      <p className="text-gray-600 mb-8">
        Welcome! You can sign in with your Google account to save your data across devices.
      </p>

      {error && ( // Display error message if anonymous sign-in failed
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {/* Google Sign-In Button. */}
      <button
        onClick={signInWithGoogle} // Attaches the signInWithGoogle function to the button's click event.
        className="bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-gray-100 flex items-center justify-center w-full max-w-xs mx-auto transition-transform transform hover:scale-105"
      >
        {/* Google icon SVG. */}
        <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.508,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

export default AuthContainer; // Export the AuthContainer component for use in other parts of the application