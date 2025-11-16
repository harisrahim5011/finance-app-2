import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingIndicator from './LoadingIndicator';

/**
 * AuthContainer Component
 *
 * Manages the authentication UI flow for the Finance Tracker application.
 *
 * Responsibilities:
 * - Displays loading indicator during initial auth check and automatic anonymous sign-in
 * - Shows Google sign-in button when user is not authenticated
 * - Returns null once user is authenticated (lets parent render main app)
 *
 * Authentication Flow:
 * 1. Component mounts → useAuth hook initiates automatic anonymous sign-in
 * 2. While loading → Display LoadingIndicator
 * 3. If anonymous sign-in succeeds → Return null (main app renders instead)
 * 4. If anonymous sign-in fails → Show Google Sign-In button with error message
 * 5. User clicks "Sign in with Google" → Firebase Google auth dialog opens
 * 6. After successful Google sign-in → Return null (main app renders)
 *
 * Parent component (App.jsx) handles conditional rendering:
 * - If currentUser exists → Render AppContainer (main app)
 * - If currentUser is null → Render AuthContainer (this component)
 *
 * @component
 * @returns {JSX.Element|null} Sign-in UI or null if user authenticated
 */
const AuthContainer = () => {
  // ==================== Authentication State ====================
  // Destructure authentication-related state and functions from the useAuth hook.
  // - currentUser: The currently authenticated user object (null if not authenticated)
  //               Can be anonymous user { isAnonymous: true } or Google user
  // - signInWithGoogle: Function to initiate the Google sign-in process
  // - loading: Boolean flag indicating auth operation is in progress
  // - error: Error message string if automatic anonymous sign-in failed
  const { currentUser, signInWithGoogle, loading, error } = useAuth();

  // ==================== Conditional Rendering Logic ====================
  /**
   * Step 1: Show loading indicator while auth operations are in progress
   * This happens during:
   * - Initial Firebase initialization
   * - Automatic anonymous sign-in attempt
   * - User clicking Google sign-in button
   *
   * User should see a spinning loader, not blank screen or sign-in button
   */
  if (loading) {
    return <LoadingIndicator />;
  }

  /**
   * Step 2: User is authenticated (either anonymous or Google)
   * Return null to let parent component render the main app (AppContainer)
   *
   * Why return null?
   * - Parent (App.jsx) conditionally renders based on currentUser
   * - If currentUser is truthy → render AppContainer
   * - If currentUser is null → render AuthContainer
   *
   * By returning null here, we signal parent that auth is complete
   * and main app should take over the rendering
   */
  if (currentUser) {
    return null;
  }

  /**
   * Step 3: User is not authenticated and loading is complete
   * Show the sign-in screen
   *
   * This state occurs when:
   * - Automatic anonymous sign-in failed (error occurred)
   * - User explicitly signed out
   * - User explicitly rejected sign-in
   *
   * Display error message (if any) and offer Google sign-in as alternative
   */
  return (
    // ==================== Sign-In Screen UI ====================
    // Main container for the authentication screen
    // Styled with white background, shadow, and centered layout
    <div className="text-center bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
      {/* Application Branding Section */}
      {/* Title: Application name and welcome message */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Finance Tracker</h1>
      
      {/* Introductory text explaining the benefits of signing in */}
      <p className="text-gray-600 mb-8">
        Welcome! You can sign in with your Google account to save your data across devices.
      </p>

      {/* Error Message Display */}
      {/* Show error if automatic anonymous sign-in failed */}
      {/* This provides feedback about why sign-in options are needed */}
      {error && (
        <p className="text-red-500 mb-4 text-sm font-medium">
          {error}
        </p>
      )}

      {/* Google Sign-In Button */}
      {/* Primary action button for user authentication */}
      {/* Triggers Firebase Google OAuth flow on click */}
      <button
        onClick={signInWithGoogle}
        className="bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-gray-100 flex items-center justify-center w-full max-w-xs mx-auto transition-transform transform hover:scale-105"
      >
        {/* Google Icon SVG */}
        {/* Multi-colored Google 'G' logo with official colors: blue, red, yellow, green */}
        <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
          {/* Yellow background arc */}
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
          {/* Red section */}
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
          {/* Green section */}
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
          {/* Blue section */}
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.508,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
        {/* Button text */}
        Sign in with Google
      </button>
    </div>
  );
};

export default AuthContainer;