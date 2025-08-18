import React from 'react';

/**
 * UserInfo Component
 *
 * This component displays the authenticated user's profile information,
 * including their display name, profile picture, and user ID.
 * It also provides a button to sign out the user for non-anonymous accounts.
 * For anonymous users, it will additionally show a Google Sign-In button
 * to allow them to upgrade their account.
 *
 * @param {object} props - The component's props.
 * @param {object} props.user - The user object, typically from Firebase Authentication,
 * containing properties like `displayName`, `photoURL`, `uid`, and `isAnonymous`.
 * @param {function} props.onSignOut - A callback function to be executed when the sign-out button is clicked.
 * @param {function} props.onSignInGoogle - A callback function to be executed when the Google Sign-In button is clicked (for anonymous users).
 */
const UserInfo = ({ user, onSignOut, onSignInGoogle }) => {
  // Safely get the first letter of the user's display name for a placeholder image.
  // If displayName is null or undefined, default to 'U'.
  const firstLetter = user.displayName?.charAt(0) || 'U';

  // Determine the photo URL. Use the user's photoURL if available,
  // otherwise generate a placeholder image URL with the first letter of their name.
  const photoUrl = user.photoURL || `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;

  // --- Component JSX Structure ---
  return (
    // Container for user information, styled with flexbox for alignment.
    <div className="flex items-center justify-between">
      {/* Left section: user photo and name/ID. */}
      <div className="flex items-center">
        {/* User profile image. */}
        <img
          src={photoUrl} // Source of the image (actual photo or placeholder)
          className="w-10 h-10 rounded-full mr-4" // Tailwind classes for styling
          alt="User Photo" // Alt text for accessibility
          // onError handler: if the image fails to load, replace its source with a placeholder.
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop if placeholder also fails
            e.target.src = `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`; // Fallback placeholder
          }}
        />
        {/* Container for user's name and ID, and potentially the Google Sign-In button. */}
        <div>
          {/* User's display name. If null, default to 'Guest User'. */}
          <p className="font-semibold text-gray-800 text-left">{user.displayName || 'Guest User'}</p>
          {/* User's unique ID. */}
          {/* <p className="text-sm text-gray-500 text-left">User ID: {user.uid}</p> */}

          {/* Conditional rendering for Google Sign-In button: Only show if the user is anonymous */}
          {user.isAnonymous && (
            <button
              onClick={onSignInGoogle} // Triggers the onSignInGoogle callback when clicked.
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center" // Tailwind classes for styling, including flex for icon alignment
            >
              {/* Google icon SVG */}
              <svg className="w-4 h-4 mr-1" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.508,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
      {/* Right section: Sign Out button, conditionally rendered only if the user is NOT anonymous. */}
      {!user.isAnonymous && ( // SIGNIFICANT CHANGE: Conditional rendering added here
        <button
          onClick={onSignOut} // Triggers the onSignOut callback when clicked.
          className="text-sm text-blue-600 hover:text-blue-800 font-semibold" // Tailwind classes for styling
        >
          Sign Out
        </button>
      )}
    </div>
  );
};

export default UserInfo; // Export the UserInfo component for use in other parts of the application.
