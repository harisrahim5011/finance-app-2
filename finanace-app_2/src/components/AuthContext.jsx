import React, { createContext, useEffect, useState, useContext } from "react";
import { auth, db, provider } from "../firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
} from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";

/**
 * ==================== AuthContext ====================
 * React Context for managing global authentication state
 *
 * Purpose:
 * Provides authentication-related data and functions to all components
 * wrapped by AuthProvider without prop drilling.
 *
 * Context Value Structure:
 * {
 *   currentUser: FirebaseUser | null,      // Currently authenticated user
 *   signInWithGoogle: Function,            // Trigger Google OAuth flow
 *   signOutUser: Function,                 // Sign out current user
 *   loading: boolean,                      // Auth operation in progress
 *   error: string | null                   // Error message if any
 * }
 */
export const AuthContext = createContext();

/**
 * useAuth Custom Hook
 *
 * Provides easy access to authentication context throughout the application.
 *
 * Usage:
 * const { currentUser, signInWithGoogle, signOutUser, loading, error } = useAuth();
 *
 * This hook:
 * - Simplifies context access (no need for useContext directly)
 * - Provides clear error message if used outside AuthProvider
 * - Makes dependency tracking explicit
 *
 * @returns {Object} Authentication state and functions
 * @throws {Error} If used outside of an AuthProvider
 *
 * @example
 * function MyComponent() {
 *   const { currentUser, loading } = useAuth();
 *   if (loading) return <LoadingSpinner />;
 *   return <div>{currentUser?.displayName}</div>;
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * AuthProvider Component
 *
 * Core Context Provider for authentication management.
 *
 * Responsibilities:
 * - Manages global authentication state (currentUser, loading, error)
 * - Provides sign-in/sign-out functions to all child components
 * - Automatically attempts anonymous sign-in on app load
 * - Creates user profiles in Firestore for all authenticated users
 * - Handles auth state changes from Firebase
 *
 * Authentication Flow:
 * 1. App mounts → AuthProvider initializes → onAuthStateChanged listener set up
 * 2. If user exists (from previous session) → Load their profile
 * 3. If no user → Attempt automatic anonymous sign-in
 * 4. User interactions (Google sign-in, sign-out) → Update state via listener
 * 5. All auth changes trigger profile creation/update in Firestore
 *
 * Props:
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components that consume AuthContext
 *
 * @returns {JSX.Element} Provider wrapper around children
 */
export function AuthProvider({ children }) {
  // ==================== Authentication State ====================
  // Stores the authenticated user object from Firebase Auth
  // - Null if no user is authenticated
  // - Contains: { uid, email, displayName, isAnonymous, ... }
  const [currentUser, setCurrentUser] = useState(null);

  // Loading flag indicating async auth operation in progress
  // Set to true initially to prevent premature component rendering
  // before Firebase auth state is determined
  const [loading, setLoading] = useState(true);

  // Stores error message from failed auth operations
  // Used for user feedback (e.g., "Sign-in failed" messages)
  // Cleared on successful auth state changes
  const [error, setError] = useState(null);

  // ==================== Firestore User Profile Helper ====================
  /**
   * Creates or updates a user document in Firestore
   *
   * Called for both Google and anonymous users to ensure consistent
   * user data structure across the application.
   *
   * Data stored:
   * - uid: Unique identifier from Firebase Auth
   * - email: User's email (null for anonymous users)
   * - displayName: User's display name or 'Guest User' for anonymous
   * - isAnonymous: Boolean flag for auth type
   * - lastLogin: Timestamp of last auth event
   *
   * Uses { merge: true } to preserve existing data and avoid overwrites.
   *
   * @async
   * @param {Object} user - Firebase User object from Auth
   * @returns {Promise<void>}
   */
  const createUserProfile = async (user) => {
    // Guard: Check if Firestore is available
    if (!db) {
      console.warn("Firestore 'db' instance is not available. Cannot create user profile.");
      return;
    }

    try {
      // Reference to user document in 'users' collection
      const userRef = doc(db, `users`, user.uid);

      // Create or merge user profile data
      // merge: true prevents overwriting existing fields
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || (user.isAnonymous ? 'Guest User' : null),
        isAnonymous: user.isAnonymous,
        lastLogin: Timestamp.now()
      }, { merge: true });
    } catch (err) {
      // Profile creation errors are logged but not fatal
      // User can still use the app with in-memory state
      console.error("Error creating or updating user profile in Firestore:", err);
    }
  };


  // ==================== Firebase Auth State Listener ====================
  /**
   * Effect: Set up Firebase authentication state observer
   *
   * This effect:
   * 1. Runs once on component mount (empty dependency array)
   * 2. Sets up onAuthStateChanged listener (Firebase auto-login detection)
   * 3. Handles automatic anonymous sign-in if no user is logged in
   * 4. Creates/updates user profiles in Firestore
   * 5. Cleans up listener on unmount
   *
   * Data Flow:
   * User exists from session
   *   ↓
   * Load profile, set loading = false
   *
   * No user + anonymous sign-in succeeds
   *   ↓
   * onAuthStateChanged triggers again with anon user
   *   ↓
   * Create anon profile, set loading = false
   *
   * No user + anonymous sign-in fails
   *   ↓
   * Show error, set loading = false
   *   ↓
   * User must click "Sign in with Google"
   *
   * Dependency: [] (Mount only)
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError(null); // Clear previous errors on each state change

      if (user) {
        // User is authenticated (Google or anonymous session)
        setCurrentUser(user);
        // Ensure user has a profile document in Firestore
        await createUserProfile(user);
        // Auth state is determined, stop showing loader
        setLoading(false);
      } else {
        // No authenticated user found
        console.log("No authenticated user found. Attempting anonymous sign-in...");
        try {
          // Try to sign in automatically as anonymous guest
          await firebaseSignInAnonymously(auth);
          // Success! onAuthStateChanged will trigger again with the new anonymous user
          // That callback will handle profile creation and loading state
        } catch (err) {
          // Anonymous sign-in failed (rare, but possible)
          console.error("Failed to sign in anonymously automatically:", err);
          setError("Could not sign in as a guest. Please try signing in with Google.");
          // Stop loading—user must manually sign in with Google
          setLoading(false);
        }
      }
    });

    // Cleanup: Unsubscribe from listener when provider unmounts
    // Prevents memory leaks and orphaned listeners
    return unsubscribe;
  }, []); // Empty array: This effect runs once on mount, never again

  // ==================== Authentication Functions ====================
  /**
   * Google Sign-In Handler
   *
   * Initiates Firebase Google OAuth sign-in flow using popup dialog.
   *
   * Flow:
   * 1. User clicks "Sign in with Google" button
   * 2. Firebase popup opens Google login dialog
   * 3. User authenticates with Google (or selects existing account)
   * 4. Google sends auth token back to Firebase
   * 5. onAuthStateChanged listener fires automatically
   * 6. User profile created in Firestore
   * 7. Component receives updated currentUser
   * 8. App navigates to main content
   *
   * Error handling:
   * - Popup blocked by browser → user sees error
   * - User cancels Google login → error shown
   * - Network error → error shown with retry option
   *
   * @async
   * @returns {Promise<void>}
   */
  const signInWithGoogle = async () => {
    setLoading(true); // Show loader during OAuth flow
    setError(null); // Clear previous errors
    try {
      // Open Google sign-in popup
      await signInWithPopup(auth, provider);
      // onAuthStateChanged listener will automatically handle state update
    } catch (err) {
      console.error("Error signing in with Google:", err);
      setError(err.message); // Display user-friendly error
    } finally {
      setLoading(false); // Hide loader
    }
  };

  /**
   * Sign-Out Handler
   *
   * Signs out the current user from Firebase.
   *
   * Flow:
   * 1. User clicks "Sign Out" button
   * 2. Session is terminated in Firebase Auth
   * 3. onAuthStateChanged listener fires with user = null
   * 4. Automatic anonymous sign-in attempt occurs
   * 5. If successful → anon user created, app continues
   * 6. If failed → user sees sign-in screen
   *
   * Note: After sign-out, the auth listener attempts automatic
   * anonymous sign-in, so signed-out users aren't fully logged out.
   * They transition to guest/anonymous mode.
   *
   * @async
   * @returns {Promise<void>}
   */
  const signOutUser = async () => {
    setLoading(true); // Show loader during sign-out
    setError(null); // Clear previous errors
    try {
      await signOut(auth); // Sign out from Firebase
      // onAuthStateChanged will trigger, attempting anonymous sign-in
    } catch (err) {
      console.error("Error signing out:", err);
      setError(err.message); // Display error to user
    } finally {
      setLoading(false); // Hide loader
    }
  };

  // ==================== Context Provider ====================
  // Prepare context value with all auth state and functions
  const value = {
    currentUser,        // Currently authenticated user (Google or anonymous)
    signInWithGoogle,   // Function to trigger Google OAuth sign-in
    signOutUser,        // Function to sign out current user
    loading,            // Boolean: auth operation in progress
    error,              // Error message string or null
  };

  // Provide authentication context to all child components
  // Child components access via useAuth() custom hook
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}