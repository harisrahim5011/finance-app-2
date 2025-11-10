import React, { useState } from "react";
import { MoreVertical } from "lucide-react"; // Import the menu icon

/**
 * UserInfo Component
 *
 * This component displays the authenticated user's profile information,
 * including their display name, profile picture, and user ID.
 * It also provides a button to sign out the user for non-anonymous accounts,
 * now located inside a dropdown menu accessed via the vertical ellipsis icon.
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
  // State to control the visibility of the user menu dropdown
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  // --- State for Month Cycle Control ---
  const [cycleType, setCycleType] = useState("calendar");
  const [customStartDay, setCustomStartDay] = useState(15); // Default start day 15 for custom
  const [customEndDay, setCustomEndDay] = useState(14); // Default end day 14 for custom (15th to 14th)
  // --- END: State for Month Cycle Control ---

  // Safely get the first letter of the user's display name for a placeholder image.
  // If displayName is null or undefined, default to 'U'.
  const firstLetter = user.displayName?.charAt(0) || "U";

  // Determine the photo URL. Use the user's photoURL if available,
  // otherwise generate a placeholder image URL with the first letter of their name.
  const photoUrl =
    user.photoURL ||
    `https://placehold.co/40x40/E2E8F0/4A5568?text=${firstLetter}`;

  // Effect to handle clicks outside the menu to close it
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);
  // Handler for custom start day input
  const handleDayChange = (setter) => (e) => {
    const day = parseInt(e.target.value, 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      setter(day);
    }
  };

  // Helper to display the currently selected cycle range type
  const getCurrentCycleDisplay = () => {
    if (cycleType === "calendar") {
      return "Calendar Month (1st - EOM)";
    } else {
      // Logic to determine if the cycle spans into the next month
      const isSpanning =
        customEndDay < customStartDay ||
        (customStartDay === customEndDay && customStartDay !== 1);
      const endText = isSpanning ? "(Next Month)" : "(Same Month)";
      return `${customStartDay}th to ${customEndDay}th ${endText}`;
    }
  };

  // --- Component JSX Structure ---
  return (
    // Container for user information, styled with flexbox for alignment and justified space.
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
          <p className="font-semibold text-gray-800 text-left">
            {user.displayName || "Guest User"}
          </p>
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
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                ></path>
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                ></path>
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                ></path>
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.508,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                ></path>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>

      {/* Right section: User Menu (contains Sign Out action) */}
      <div className="relative" ref={menuRef}>
        {/* Menu Icon (MoreVertical) */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)} // Toggle the menu visibility
          className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150 focus:outline-none"
          aria-label="User Menu"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {/* Dropdown Menu Panel */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div
              className="py-1"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
            >
              {/* Menu Item: Sign Out (Only visible for non-anonymous users) */}
              {!user.isAnonymous && (
                <button
                  onClick={() => {
                    onSignOut(); // Execute sign out action
                    setIsMenuOpen(false); // Close the menu
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 font-medium transition-colors duration-150"
                  role="menuitem"
                >
                  Sign Out
                </button>
              )}
              {/* Other potential menu items (e.g., Settings, Profile) would go here */}
              <div className="text-xs text-gray-400 px-4 py-1 border-t mt-1">
                {user.displayName || "Guest User"}
              </div>
            </div>
            {/* --- Cycle Selection Controls --- */}
            <div className="px-4 pt-2 pb-3 border-t mt-1">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Billing Cycle Setting
              </p>

              <p className="text-xs text-gray-500 mb-2">
                Current:{" "}
                <span className="font-normal text-gray-700">
                  {getCurrentCycleDisplay()}
                </span>
              </p>

              <div className="flex space-x-2 mb-3">
                {/* Calendar Month Radio Button */}
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="cycleType"
                    value="calendar"
                    checked={cycleType === "calendar"}
                    onChange={() => setCycleType("calendar")}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span>Calendar Month</span>
                </label>

                {/* Custom Cycle Radio Button */}
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="cycleType"
                    value="custom"
                    checked={cycleType === "custom"}
                    onChange={() => setCycleType("custom")}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span>Custom Cycle</span>
                </label>
              </div>

              {/* Custom Day Input (Visible only if 'custom' is selected) */}
              {/* Custom Day Inputs (Start and End) */}
              {cycleType === "custom" && (
                <div className="flex flex-col space-y-2 p-2 bg-blue-50 border border-blue-200 rounded-lg transition-opacity">
                  {/* Start Day Input */}
                  <div className="flex justify-between items-center space-x-2">
                    <label
                      htmlFor="startDay"
                      className="text-sm text-gray-700 whitespace-nowrap"
                    >
                      Cycle Starts Day:
                    </label>
                    <input
                      id="startDay"
                      type="number"
                      min="1"
                      max="31"
                      value={customStartDay}
                      onChange={handleDayChange(setCustomStartDay)}
                      className="w-14 p-1 border border-blue-300 rounded-md text-center text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* End Day Input */}
                  <div className="flex justify-between items-center space-x-2">
                    <label
                      htmlFor="endDay"
                      className="text-sm text-gray-700 whitespace-nowrap"
                    >
                      Cycle Ends Day:
                    </label>
                    <input
                      id="endDay"
                      type="number"
                      min="1"
                      max="31"
                      value={customEndDay}
                      onChange={handleDayChange(setCustomEndDay)}
                      className="w-14 p-1 border border-blue-300 rounded-md text-center text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* --- END Cycle Selection Controls --- */}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfo; // Export the UserInfo component for use in other parts of the application.
