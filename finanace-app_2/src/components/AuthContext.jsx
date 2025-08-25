import React, { createContext, useEffect, useState, useContext } from "react"; // Added useContext for the useAuth hook pattern
import { auth, db, provider } from "../firebase"; // Assuming 'auth', 'db', and 'provider' are Firebase instances. 'db' is needed for user profiles.
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged, // Make sure onAuthStateChanged is explicitly imported
  signInAnonymously as firebaseSignInAnonymously, // Import as an alias to avoid naming conflicts
} from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore"; // Import Firestore methods for user profiles

/**
 * AuthContext
 *
 * This React Context is used to provide authentication-related state and functions
 * to all components wrapped by the AuthProvider.
 */
export const AuthContext = createContext();

/**
 * useAuth Hook
 *
 * A custom hook to consume the AuthContext. This makes it easier for components
 * to access the authentication state and functions without directly using useContext.
 * @returns {object} The value provided by the AuthContext.
 * @throws {Error} If used outside of an AuthProvider.
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
 * This component acts as a provider for the AuthContext. It manages the authentication state
 * (currentUser, loading, error) and provides functions for signing in and signing out.
 * All child components wrapped by AuthProvider will have access to these values.
 * It automatically attempts to sign in users anonymously if they are not authenticated.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The child components that will consume the AuthContext.
 */
export function AuthProvider({ children }) {
  // currentUser: Stores the authenticated user object from Firebase, or null if no user is signed in.
  const [currentUser, setCurrentUser] = useState(null);
  // loading: A boolean flag indicating whether an authentication operation is in progress (e.g., initial check, sign-in, sign-out).
  const [loading, setLoading] = useState(true); // Start as true to indicate initial auth check
  // error: Stores any authentication-related errors for display.
  const [error, setError] = useState(null);

  /**
   * Helper function to create or update a user document in Firestore.
   * This is called for both Google and anonymous users to ensure they have a record
   * in your `users` collection.
   * @param {object} user - The Firebase User object.
   */
  const createUserProfile = async (user) => {
    // Only proceed if db is available
    if (!db) {
      console.warn("Firestore 'db' instance is not available. Cannot create user profile.");
      return;
    }

    try {
      // Create a reference to the user's document
      const userRef = doc(db, `users`, user.uid); // Assuming 'users' collection at the root
      // Use setDoc with merge: true to avoid overwriting and only update fields.
      // This is safe for both new and existing user profiles.
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null, // Will be null for anonymous users
        displayName: user.displayName || (user.isAnonymous ? 'Guest User' : null), // Default name for anonymous
        isAnonymous: user.isAnonymous,
        lastLogin: Timestamp.now() // Record last login time
      }, { merge: true });
    } catch (err) {
      console.error("Error creating or updating user profile in Firestore:", err);
      // You might want to set an error state here if this is critical
    }
  };


  /**
   * useEffect Hook for Authentication State Changes
   *
   * This effect sets up an observer on Firebase authentication state changes.
   * It runs once on component mount and cleans up the observer on unmount.
   * It now includes logic to automatically sign in anonymous users if no user is found.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError(null); // Clear any previous errors on new auth state change

      if (user) {
        // A user is signed in (either from Google or a previous anonymous session)
        setCurrentUser(user);
        await createUserProfile(user); // Ensure their profile exists in Firestore
        setLoading(false); // Authentication state determined
      } else {
        // No user is signed in. Attempt to sign in anonymously.
        console.log("No authenticated user found. Attempting anonymous sign-in...");
        try {
          await firebaseSignInAnonymously(auth);
          // If successful, onAuthStateChanged will trigger again with the new anonymous user,
          // which will then fall into the 'if (user)' block above.
        } catch (err) {
          console.error("Failed to sign in anonymously automatically:", err);
          setError("Could not sign in as a guest. Please try signing in with Google.");
          setLoading(false); // Stop loading even if anonymous sign-in failed
        }
      }
    });

    // Cleanup function: unsubscribe from the auth state listener when the component unmounts.
    return unsubscribe;
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  /**
   * signInWithGoogle Function
   *
   * Initiates the Google sign-in process using a Firebase popup.
   * Sets loading state to true during the operation and handles potential errors.
   */
  const signInWithGoogle = async () => {
    setLoading(true); // Start loading indicator
    setError(null); // Clear previous errors
    try {
      await signInWithPopup(auth, provider); // Perform Google sign-in with popup
      // The onAuthStateChanged listener will automatically update currentUser and loading states on success.
    } catch (err) {
      console.error("Error signing in with Google:", err); // Log any errors during sign-in
      setError(err.message); // Set error message for display
    } finally {
      setLoading(false); // Ensure loading is false, even if onAuthStateChanged takes time or fails.
    }
  };

  /**
   * signOutUser Function
   *
   * Initiates the user sign-out process from Firebase.
   * Sets loading state to true during the operation and handles potential errors.
   */
  const signOutUser = async () => {
    setLoading(true); // Start loading indicator
    setError(null); // Clear previous errors
    try {
      await signOut(auth); // Perform user sign-out
      // The onAuthStateChanged listener will automatically update currentUser to null.
      // After signOut, the useEffect will attempt to sign in anonymously again.
    } catch (err) {
      console.error("Error signing out:", err); // Log any errors during sign-out
      setError(err.message); // Set error message for display
    } finally {
      setLoading(false); // Ensure loading is false
    }
  };

  // The value object containing the authentication state and functions to be provided by the context.
  const value = {
    currentUser,
    signInWithGoogle,
    signOutUser,
    loading,
    error, // Expose error state
  };

  // Render the AuthContext.Provider, making the 'value' available to its children.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}